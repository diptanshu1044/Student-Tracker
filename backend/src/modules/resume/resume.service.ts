import fs from "node:fs/promises";
import path from "node:path";
import { StatusCodes } from "http-status-codes";
import { Types } from "mongoose";
import { ResumeModel } from "../../models/resume.model";
import { AppError } from "../../shared/utils/app-error";

interface CreateResumeInput {
  userId: string;
  name: string;
  content?: Record<string, unknown> | string;
  fileUrl?: string;
  tags?: string[];
}

interface CreateUploadedResumeInput {
  userId: string;
  name: string;
  file: Express.Multer.File;
  tags?: string[];
}

function sanitizeSegment(input: string) {
  return input.replace(/[^a-zA-Z0-9.-]/g, "-").replace(/-+/g, "-");
}

async function getNextResumeVersion(userId: string) {
  const latest = await ResumeModel.findOne({ userId: new Types.ObjectId(userId) }).sort({ version: -1 });
  return latest ? latest.version + 1 : 1;
}

export async function listResumes(userId: string) {
  return ResumeModel.find({ userId: new Types.ObjectId(userId) }).sort({ updatedAt: -1 });
}

export async function createResume(input: CreateResumeInput) {
  if (!input.content && !input.fileUrl) {
    throw new AppError("Either content or fileUrl is required", StatusCodes.BAD_REQUEST);
  }

  const version = await getNextResumeVersion(input.userId);

  return ResumeModel.create({
    userId: input.userId,
    name: input.name,
    content: input.content,
    fileUrl: input.fileUrl,
    tags: input.tags ?? [],
    version
  });
}

export async function createUploadedResume(input: CreateUploadedResumeInput) {
  const safeUserId = sanitizeSegment(input.userId);
  const fileExt = path.extname(input.file.originalname) || ".pdf";
  const fileName = `${Date.now()}-${sanitizeSegment(path.basename(input.file.originalname, fileExt))}${fileExt}`;

  const relativeDir = path.join("uploads", "resumes", safeUserId);
  const absoluteDir = path.join(process.cwd(), relativeDir);
  await fs.mkdir(absoluteDir, { recursive: true });

  const absoluteFilePath = path.join(absoluteDir, fileName);
  await fs.writeFile(absoluteFilePath, input.file.buffer);

  const fileUrl = `/${path.join(relativeDir, fileName).replace(/\\/g, "/")}`;
  const version = await getNextResumeVersion(input.userId);

  return ResumeModel.create({
    userId: input.userId,
    name: input.name,
    fileUrl,
    tags: input.tags ?? [],
    version
  });
}
