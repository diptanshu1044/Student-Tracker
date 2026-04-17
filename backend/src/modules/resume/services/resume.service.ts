import { StatusCodes } from "http-status-codes";
import { Types } from "mongoose";
import { JobApplicationModel } from "../../../models/job-application.model";
import { ResumeModel } from "../../../models/resume.model";
import { ResumeUsageModel } from "../../../models/resume-usage.model";
import { AppError } from "../../../shared/utils/app-error";
import { uploadResumeContent, uploadResumeFile } from "./storage.service";

type ListSort = "latest" | "most_used";

interface ListResumesInput {
  userId: string;
  tags?: string[];
  sort?: ListSort;
}

interface CreateResumeInput {
  userId: string;
  name: string;
  content?: Record<string, unknown> | string;
  fileUrl?: string;
  tags?: string[];
  description?: string;
  isDefault?: boolean;
}

interface CreateUploadedResumeInput {
  userId: string;
  name: string;
  file: Express.Multer.File;
  tags?: string[];
  description?: string;
  isDefault?: boolean;
}

function toObjectId(value: string) {
  return new Types.ObjectId(value);
}

function normalizeTags(tags?: string[]) {
  if (!tags) {
    return [];
  }

  return Array.from(
    new Set(
      tags
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean)
    )
  );
}

async function getNextResumeVersion(userId: string, name: string) {
  const latestByName = await ResumeModel.findOne({
    userId: toObjectId(userId),
    name: { $regex: `^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" }
  }).sort({ version: -1 });

  return latestByName ? latestByName.version + 1 : 1;
}

async function ensureOwnedResume(userId: string, resumeId: string) {
  const resume = await ResumeModel.findOne({
    _id: toObjectId(resumeId),
    userId: toObjectId(userId)
  });

  if (!resume) {
    throw new AppError("Resume not found", StatusCodes.NOT_FOUND);
  }

  return resume;
}

async function ensureSingleDefaultResume(userId: string, resumeId: string) {
  const userObjectId = toObjectId(userId);
  const resumeObjectId = toObjectId(resumeId);

  await ResumeModel.updateMany(
    {
      userId: userObjectId,
      _id: { $ne: resumeObjectId },
      isDefault: true
    },
    {
      $set: { isDefault: false }
    }
  );

  await ResumeModel.updateOne(
    {
      _id: resumeObjectId,
      userId: userObjectId
    },
    {
      $set: { isDefault: true }
    }
  );
}

async function maybeAutoAssignDefault(userId: string, resumeId: string) {
  const hasDefault = await ResumeModel.exists({ userId: toObjectId(userId), isDefault: true });
  if (!hasDefault) {
    await ensureSingleDefaultResume(userId, resumeId);
  }
}

export async function listResumes(input: ListResumesInput) {
  const userObjectId = toObjectId(input.userId);
  const match: Record<string, unknown> = { userId: userObjectId };

  const normalizedTags = normalizeTags(input.tags);
  if (normalizedTags.length > 0) {
    match.tags = { $in: normalizedTags };
  }

  if (input.sort === "most_used") {
    const items = await ResumeModel.aggregate<{
      _id: Types.ObjectId;
      userId: Types.ObjectId;
      name: string;
      content?: Record<string, unknown> | string;
      fileUrl?: string;
      fileType?: "pdf" | "docx";
      tags: string[];
      version: number;
      isDefault: boolean;
      description?: string;
      createdAt: Date;
      updatedAt: Date;
      usageCount: number;
    }>([
      { $match: match },
      {
        $lookup: {
          from: "resumeusages",
          localField: "_id",
          foreignField: "resumeId",
          as: "usageRecords"
        }
      },
      {
        $addFields: {
          usageCount: { $size: "$usageRecords" }
        }
      },
      {
        $project: {
          usageRecords: 0
        }
      },
      { $sort: { usageCount: -1, updatedAt: -1 } }
    ]);

    return items;
  }

  return ResumeModel.find(match).sort({ updatedAt: -1 });
}

export async function createResume(input: CreateResumeInput) {
  if (!input.content && !input.fileUrl) {
    throw new AppError("Either content or fileUrl is required", StatusCodes.BAD_REQUEST);
  }

  const normalizedName = input.name.trim();
  if (!normalizedName) {
    throw new AppError("Resume name is required", StatusCodes.BAD_REQUEST);
  }

  const version = await getNextResumeVersion(input.userId, normalizedName);

  const uploadedContent =
    input.content && !input.fileUrl
      ? await uploadResumeContent({
          userId: input.userId,
          resumeName: normalizedName,
          content: input.content
        })
      : null;

  const created = await ResumeModel.create({
    userId: toObjectId(input.userId),
    name: normalizedName,
    content: input.content,
    fileUrl: input.fileUrl ?? uploadedContent?.fileUrl,
    tags: normalizeTags(input.tags),
    description: input.description?.trim(),
    version,
    isDefault: Boolean(input.isDefault)
  });

  if (input.isDefault) {
    await ensureSingleDefaultResume(input.userId, created._id.toString());
  } else {
    await maybeAutoAssignDefault(input.userId, created._id.toString());
  }

  return ResumeModel.findById(created._id);
}

export async function createUploadedResume(input: CreateUploadedResumeInput) {
  const normalizedName = input.name.trim();
  if (!normalizedName) {
    throw new AppError("Resume name is required", StatusCodes.BAD_REQUEST);
  }

  const uploaded = await uploadResumeFile({
    userId: input.userId,
    file: input.file
  });

  const version = await getNextResumeVersion(input.userId, normalizedName);

  const created = await ResumeModel.create({
    userId: toObjectId(input.userId),
    name: normalizedName,
    fileUrl: uploaded.fileUrl,
    fileType: uploaded.fileType,
    tags: normalizeTags(input.tags),
    description: input.description?.trim(),
    version,
    isDefault: Boolean(input.isDefault)
  });

  if (input.isDefault) {
    await ensureSingleDefaultResume(input.userId, created._id.toString());
  } else {
    await maybeAutoAssignDefault(input.userId, created._id.toString());
  }

  return ResumeModel.findById(created._id);
}

export async function setDefaultResume(userId: string, resumeId: string) {
  await ensureOwnedResume(userId, resumeId);
  await ensureSingleDefaultResume(userId, resumeId);
  return ResumeModel.findById(toObjectId(resumeId));
}

export async function deleteResume(userId: string, resumeId: string) {
  const userObjectId = toObjectId(userId);
  const resumeObjectId = toObjectId(resumeId);

  const existing = await ResumeModel.findOne({
    _id: resumeObjectId,
    userId: userObjectId
  });

  if (!existing) {
    throw new AppError("Resume not found", StatusCodes.NOT_FOUND);
  }

  const activeLinksCount = await JobApplicationModel.countDocuments({
    userId: userObjectId,
    resumeId: resumeObjectId,
    status: { $in: ["applied", "oa", "interview"] }
  });

  if (activeLinksCount > 0) {
    throw new AppError(
      "Cannot delete this resume because it is linked to active job applications",
      StatusCodes.CONFLICT
    );
  }

  await Promise.all([
    ResumeUsageModel.deleteMany({ userId: userObjectId, resumeId: resumeObjectId }),
    JobApplicationModel.updateMany(
      { userId: userObjectId, resumeId: resumeObjectId },
      { $unset: { resumeId: "", resumeVersion: "" } }
    ),
    ResumeModel.deleteOne({ _id: resumeObjectId, userId: userObjectId })
  ]);

  if (existing.isDefault) {
    const nextLatest = await ResumeModel.findOne({ userId: userObjectId }).sort({ updatedAt: -1 });
    if (nextLatest) {
      await ensureSingleDefaultResume(userId, nextLatest._id.toString());
    }
  }

  return { deleted: true as const };
}

export async function getResumeStats(userId: string) {
  const userObjectId = toObjectId(userId);

  return ResumeModel.aggregate<{
    resumeId: Types.ObjectId;
    name: string;
    totalUsed: number;
    interviews: number;
    offers: number;
    successRate: number;
  }>([
    { $match: { userId: userObjectId } },
    {
      $lookup: {
        from: "resumeusages",
        let: { resumeId: "$_id", userId: "$userId" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [{ $eq: ["$resumeId", "$$resumeId"] }, { $eq: ["$userId", "$$userId"] }]
              }
            }
          }
        ],
        as: "usage"
      }
    },
    {
      $addFields: {
        totalUsed: { $size: "$usage" },
        interviews: {
          $size: {
            $filter: {
              input: "$usage",
              as: "item",
              cond: { $in: ["$$item.outcome", ["interview", "offer"]] }
            }
          }
        },
        offers: {
          $size: {
            $filter: {
              input: "$usage",
              as: "item",
              cond: { $eq: ["$$item.outcome", "offer"] }
            }
          }
        }
      }
    },
    {
      $project: {
        _id: 0,
        resumeId: "$_id",
        name: 1,
        totalUsed: 1,
        interviews: 1,
        offers: 1,
        successRate: {
          $cond: [{ $gt: ["$totalUsed", 0] }, { $divide: ["$offers", "$totalUsed"] }, 0]
        }
      }
    },
    { $sort: { totalUsed: -1, name: 1 } }
  ]);
}

export async function compareResumes(userId: string) {
  const userObjectId = toObjectId(userId);

  return ResumeModel.aggregate<{
    resumeId: Types.ObjectId;
    name: string;
    totalUsed: number;
    responseRate: number;
    interviewRate: number;
    offerRate: number;
  }>([
    { $match: { userId: userObjectId } },
    {
      $lookup: {
        from: "resumeusages",
        let: { resumeId: "$_id", userId: "$userId" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [{ $eq: ["$resumeId", "$$resumeId"] }, { $eq: ["$userId", "$$userId"] }]
              }
            }
          }
        ],
        as: "usage"
      }
    },
    {
      $addFields: {
        totalUsed: { $size: "$usage" },
        responseCount: {
          $size: {
            $filter: {
              input: "$usage",
              as: "item",
              cond: { $in: ["$$item.outcome", ["oa", "interview", "offer"]] }
            }
          }
        },
        interviewCount: {
          $size: {
            $filter: {
              input: "$usage",
              as: "item",
              cond: { $in: ["$$item.outcome", ["interview", "offer"]] }
            }
          }
        },
        offerCount: {
          $size: {
            $filter: {
              input: "$usage",
              as: "item",
              cond: { $eq: ["$$item.outcome", "offer"] }
            }
          }
        }
      }
    },
    {
      $project: {
        _id: 0,
        resumeId: "$_id",
        name: 1,
        totalUsed: 1,
        responseRate: {
          $cond: [{ $gt: ["$totalUsed", 0] }, { $divide: ["$responseCount", "$totalUsed"] }, 0]
        },
        interviewRate: {
          $cond: [{ $gt: ["$totalUsed", 0] }, { $divide: ["$interviewCount", "$totalUsed"] }, 0]
        },
        offerRate: {
          $cond: [{ $gt: ["$totalUsed", 0] }, { $divide: ["$offerCount", "$totalUsed"] }, 0]
        }
      }
    },
    { $sort: { offerRate: -1, responseRate: -1, totalUsed: -1 } }
  ]);
}

export async function validateResumeOwnership(userId: string, resumeId: string) {
  await ensureOwnedResume(userId, resumeId);
}
