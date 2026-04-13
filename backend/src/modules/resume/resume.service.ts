import { Types } from "mongoose";
import { ResumeModel } from "../../models/resume.model";

interface CreateResumeInput {
  userId: string;
  name: string;
  content: Record<string, unknown> | string;
  tags?: string[];
}

export async function listResumes(userId: string) {
  return ResumeModel.find({ userId: new Types.ObjectId(userId) }).sort({ updatedAt: -1 });
}

export async function createResume(input: CreateResumeInput) {
  const latest = await ResumeModel.findOne({ userId: new Types.ObjectId(input.userId) }).sort({ version: -1 });
  const version = latest ? latest.version + 1 : 1;

  return ResumeModel.create({
    userId: input.userId,
    name: input.name,
    content: input.content,
    tags: input.tags ?? [],
    version
  });
}
