import path from "node:path";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
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

interface UploadResumeContentInput {
  userId: string;
  resumeName: string;
  content: Record<string, unknown> | string;
}

interface UploadedContentResult {
  fileUrl: string;
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

function serializeResumeContent(content: Record<string, unknown> | string) {
  if (typeof content === "string") {
    return {
      body: content,
      extension: ".tex",
      contentType: "text/x-tex"
    };
  }

  return {
    body: JSON.stringify(content, null, 2),
    extension: ".json",
    contentType: "application/json"
  };
}

async function uploadContentToS3(input: UploadResumeContentInput): Promise<UploadedContentResult> {
  const s3 = getS3Client();
  const serialized = serializeResumeContent(input.content);
  const safeResumeName = sanitizeSegment(input.resumeName);
  const key = `resumes/${sanitizeSegment(input.userId)}/created/${Date.now()}-${safeResumeName}${serialized.extension}`;

  try {
    await s3.send(
      new PutObjectCommand({
        Bucket: env.S3_BUCKET,
        Key: key,
        Body: serialized.body,
        ContentType: serialized.contentType
      })
    );
  } catch (error) {
    logger.error({ error, bucket: env.S3_BUCKET, region: env.S3_REGION, key }, "S3 content upload failed");

    throw new AppError(
      "Resume content upload failed. Check S3 credentials, bucket permissions, and region configuration.",
      StatusCodes.INTERNAL_SERVER_ERROR
    );
  }

  return {
    fileUrl: buildS3PublicUrl(key)
  };
}

export async function uploadResumeFile(input: UploadResumeFileInput): Promise<UploadedFileResult> {
  const fileType = resolveFileType(input.file);
  return uploadToS3(input, fileType);
}

export async function uploadResumeContent(input: UploadResumeContentInput): Promise<UploadedContentResult> {
  return uploadContentToS3(input);
}
