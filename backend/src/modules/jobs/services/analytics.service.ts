import { Types } from "mongoose";
import { JobApplicationModel } from "../../../models/job-application.model";

interface JobStatsResponse {
  totalApplications: number;
  interviews: number;
  offers: number;
  rejections: number;
  successRate: number;
  responseRate: number;
}

export async function getJobStats(userId: string): Promise<JobStatsResponse> {
  const objectUserId = new Types.ObjectId(userId);

  const grouped = await JobApplicationModel.aggregate([
    { $match: { userId: objectUserId } },
    { $group: { _id: "$status", count: { $sum: 1 } } }
  ]);

  const counts = new Map<string, number>();
  for (const item of grouped) {
    counts.set(item._id as string, item.count as number);
  }

  const applied = counts.get("applied") ?? 0;
  const oa = counts.get("oa") ?? 0;
  const interviews = counts.get("interview") ?? 0;
  const offers = counts.get("offer") ?? 0;
  const rejections = counts.get("rejected") ?? 0;

  const totalApplications = applied + oa + interviews + offers + rejections;

  return {
    totalApplications,
    interviews,
    offers,
    rejections,
    successRate: totalApplications === 0 ? 0 : Number(((offers / totalApplications) * 100).toFixed(2)),
    responseRate:
      totalApplications === 0
        ? 0
        : Number((((oa + interviews + offers) / totalApplications) * 100).toFixed(2))
  };
}

export async function getApplicationFunnel(userId: string) {
  const objectUserId = new Types.ObjectId(userId);

  const grouped = await JobApplicationModel.aggregate([
    { $match: { userId: objectUserId } },
    { $group: { _id: "$status", count: { $sum: 1 } } }
  ]);

  const counts = Object.fromEntries(grouped.map((item) => [item._id as string, item.count as number]));

  return {
    applied: counts.applied ?? 0,
    oa: counts.oa ?? 0,
    interview: counts.interview ?? 0,
    offer: counts.offer ?? 0,
    rejected: counts.rejected ?? 0
  };
}

export async function getJobInsights(userId: string) {
  const objectUserId = new Types.ObjectId(userId);

  const referralSegments = await JobApplicationModel.aggregate([
    { $match: { userId: objectUserId } },
    {
      $group: {
        _id: "$referral",
        total: { $sum: 1 },
        positiveResponses: {
          $sum: {
            $cond: [{ $in: ["$status", ["oa", "interview", "offer"]] }, 1, 0]
          }
        }
      }
    }
  ]);

  const withReferral = referralSegments.find((entry) => entry._id === true);
  const withoutReferral = referralSegments.find((entry) => entry._id === false);

  const referralResponseRate = withReferral
    ? (withReferral.positiveResponses / Math.max(withReferral.total, 1)) * 100
    : 0;
  const nonReferralResponseRate = withoutReferral
    ? (withoutReferral.positiveResponses / Math.max(withoutReferral.total, 1)) * 100
    : 0;

  const rejectedAfterOaCount = await JobApplicationModel.countDocuments({
    userId: objectUserId,
    status: "rejected",
    "statusHistory.status": "oa"
  });

  const totalRejected = await JobApplicationModel.countDocuments({
    userId: objectUserId,
    status: "rejected"
  });

  const insights: string[] = [];

  if (withReferral && withoutReferral && withReferral.total >= 3 && withoutReferral.total >= 3) {
    if (referralResponseRate >= nonReferralResponseRate + 10) {
      insights.push("You get more responses from referral applications.");
    }
  }

  if (totalRejected >= 5 && rejectedAfterOaCount / totalRejected >= 0.5) {
    insights.push("High rejection rate after OA. Consider practicing interview-focused DSA and communication.");
  }

  return {
    insights,
    metrics: {
      referralResponseRate: Number(referralResponseRate.toFixed(2)),
      nonReferralResponseRate: Number(nonReferralResponseRate.toFixed(2)),
      rejectedAfterOaCount,
      totalRejected
    }
  };
}
