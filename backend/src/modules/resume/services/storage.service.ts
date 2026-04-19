import path from "node:path";
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { StatusCodes } from "http-status-codes";
import { env } from "../../../config/env";
import { logger } from "../../../config/logger";
import { ResumeFileType } from "../../../models/resume.model";
import { AppError } from "../../../shared/utils/app-error";

interface UploadResumeFileInput {
  userId: string;
  file: Express.Multer.File;
}

interface UploadedFileResult {
  fileUrl: string;
  fileType: ResumeFileType;
}

const ALLOWED_MIME_TO_TYPE: Record<string, ResumeFileType> = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx"
};

const EXTENSION_TO_TYPE: Record<string, ResumeFileType> = {
  ".pdf": "pdf",
  ".docx": "docx"
};

function sanitizeSegment(input: string) {
  return input.replace(/[^a-zA-Z0-9.-]/g, "-").replace(/-+/g, "-");
}

function resolveFileType(file: Express.Multer.File): ResumeFileType {
  const ext = path.extname(file.originalname).toLowerCase();
  const fromMime = ALLOWED_MIME_TO_TYPE[file.mimetype];
  const fromExt = EXTENSION_TO_TYPE[ext];

  const resolved = fromMime ?? fromExt;
  if (!resolved) {
    throw new AppError("Only PDF and DOCX resumes are supported", StatusCodes.BAD_REQUEST);
  }

  if (fromMime && fromExt && fromMime !== fromExt) {
    throw new AppError("Uploaded file extension does not match its content type", StatusCodes.BAD_REQUEST);
  }

  return resolved;
}

function ensureS3Config() {
  if (!env.S3_BUCKET || !env.S3_REGION) {
    throw new AppError(
      "S3 storage is selected but S3_BUCKET or S3_REGION is missing",
      StatusCodes.INTERNAL_SERVER_ERROR
    );
  }
}

function getS3Client() {
  ensureS3Config();

  return new S3Client({
    region: env.S3_REGION,
    endpoint: env.S3_ENDPOINT,
    forcePathStyle: env.S3_FORCE_PATH_STYLE
  });
}

function buildS3PublicUrl(key: string) {
  if (env.S3_PUBLIC_BASE_URL) {
    return `${env.S3_PUBLIC_BASE_URL.replace(/\/$/, "")}/${key}`;
  }

  if (env.S3_ENDPOINT) {
    const normalizedEndpoint = env.S3_ENDPOINT.replace(/\/$/, "");
    if (env.S3_FORCE_PATH_STYLE) {
      return `${normalizedEndpoint}/${env.S3_BUCKET}/${key}`;
    }

    return `${normalizedEndpoint}/${key}`;
  }

  return `https://${env.S3_BUCKET}.s3.${env.S3_REGION}.amazonaws.com/${key}`;
}

async function uploadToS3(input: UploadResumeFileInput, fileType: ResumeFileType): Promise<UploadedFileResult> {
  const s3 = getS3Client();

  const safeUserId = sanitizeSegment(input.userId);
  const fileExt = fileType === "pdf" ? ".pdf" : ".docx";
  const fileName = `${Date.now()}-${sanitizeSegment(path.basename(input.file.originalname, path.extname(input.file.originalname)))}${fileExt}`;
  const key = `resumes/${safeUserId}/${fileName}`;

  try {
    await s3.send(
      new PutObjectCommand({
        Bucket: env.S3_BUCKET,
        Key: key,
        Body: input.file.buffer,
        ContentType:
          fileType === "pdf"
            ? "application/pdf"
            : "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      })
    );
  } catch (error) {
    logger.error({ error, bucket: env.S3_BUCKET, region: env.S3_REGION, key }, "S3 file upload failed");

    throw new AppError(
      "Resume upload failed. Check S3 credentials, bucket permissions, and region configuration.",
      StatusCodes.INTERNAL_SERVER_ERROR
    );
  }

  return {
    fileUrl: buildS3PublicUrl(key),
    fileType
  };
}


function extractS3KeyFromUrl(fileUrl: string) {
  const normalizedBucket = env.S3_BUCKET;

  if (env.S3_PUBLIC_BASE_URL && fileUrl.startsWith(env.S3_PUBLIC_BASE_URL)) {
    return fileUrl.slice(env.S3_PUBLIC_BASE_URL.length).replace(/^\//, "");
  }

  const parsedUrl = new URL(fileUrl);
  const pathname = parsedUrl.pathname.replace(/^\//, "");

  if (!pathname) {
    throw new AppError("Invalid resume file URL", StatusCodes.BAD_REQUEST);
  }

  if (pathname.startsWith(`${normalizedBucket}/`)) {
    return pathname.slice(normalizedBucket.length + 1);
  }

  return pathname;
}

export async function createSignedResumeFileUrl(fileUrl: string) {
  try {
    const key = extractS3KeyFromUrl(fileUrl);
    const client = getS3Client();

    return getSignedUrl(
      client,
      new GetObjectCommand({
        Bucket: env.S3_BUCKET,
        Key: key
      }),
      { expiresIn: 60 * 10 }
    );
  } catch (error) {
    logger.error({ error, fileUrl }, "Failed to create signed resume file URL");
    throw new AppError("Unable to open resume file right now", StatusCodes.INTERNAL_SERVER_ERROR);
  }
}

export async function uploadResumeFile(input: UploadResumeFileInput): Promise<UploadedFileResult> {
  const fileType = resolveFileType(input.file);
  return uploadToS3(input, fileType);
}
