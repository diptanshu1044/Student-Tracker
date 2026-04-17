import { StatusCodes } from "http-status-codes";
import { Types } from "mongoose";
import { PlannerTaskModel, type PlannerTaskPriority, type PlannerTaskSource } from "../../../models/planner-task.model";
import { AppError } from "../../../shared/utils/app-error";
import { type ParsedImportRow, parsePlannerImportFile } from "../utils/fileParser";

interface ImportPlannerTasksInput {
  userId: string;
  profileId: string;
  file: Express.Multer.File;
}

interface FailedRow {
  rowNumber: number;
  error: string;
}

interface CandidateTask {
  rowNumber: number;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  priority: PlannerTaskPriority;
  reminderTime?: Date;
}

const ALLOWED_PRIORITIES: PlannerTaskPriority[] = ["low", "medium", "high"];
const BATCH_SIZE = 500;

function parseIsoDate(raw: string | undefined): Date | null {
  if (!raw) {
    return null;
  }

  const parsed = new Date(raw);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

function mapSource(source: "csv" | "json" | "excel"): PlannerTaskSource {
  if (source === "excel") {
    return "excel";
  }

  return source;
}

function validateRow(row: ParsedImportRow): { task?: CandidateTask; error?: string } {
  if (!row.title || !row.description || !row.startTime || !row.endTime || !row.priority || !row.reminderTime) {
    return {
      error: "Required fields: title, description, startTime, endTime, priority, reminderTime"
    };
  }

  const priority = row.priority.toLowerCase() as PlannerTaskPriority;

  if (!ALLOWED_PRIORITIES.includes(priority)) {
    return { error: `Priority must be one of: ${ALLOWED_PRIORITIES.join(", ")}` };
  }

  const startTime = parseIsoDate(row.startTime);
  const endTime = parseIsoDate(row.endTime);
  const reminderTime = parseIsoDate(row.reminderTime);

  if (!startTime || !endTime || !reminderTime) {
    return { error: "startTime, endTime and reminderTime must be valid ISO datetime strings" };
  }

  if (endTime <= startTime) {
    return { error: "endTime must be later than startTime" };
  }

  return {
    task: {
      rowNumber: row.rowNumber,
      title: row.title,
      description: row.description,
      startTime,
      endTime,
      priority,
      reminderTime
    }
  };
}

function overlaps(leftStart: Date, leftEnd: Date, rightStart: Date, rightEnd: Date): boolean {
  return leftStart < rightEnd && rightStart < leftEnd;
}

export async function importPlannerTasks(input: ImportPlannerTasksInput) {
  const parsed = parsePlannerImportFile(input.file);
  const failedRows: FailedRow[] = [];
  const candidateTasks: CandidateTask[] = [];

  for (const row of parsed.rows) {
    const result = validateRow(row);

    if (!result.task) {
      failedRows.push({ rowNumber: row.rowNumber, error: result.error ?? "Invalid row" });
      continue;
    }

    candidateTasks.push(result.task);
  }

  if (candidateTasks.length === 0) {
    return {
      successCount: 0,
      failedRows
    };
  }

  const rangeStart = new Date(Math.min(...candidateTasks.map((task) => task.startTime.getTime())));
  const rangeEnd = new Date(Math.max(...candidateTasks.map((task) => task.endTime.getTime())));

  const existing = await PlannerTaskModel.find({
    userId: new Types.ObjectId(input.userId),
    profileId: new Types.ObjectId(input.profileId),
    startTime: { $lte: rangeEnd },
    endTime: { $gte: rangeStart }
  })
    .select("title startTime endTime")
    .lean();

  const seenBatch = new Set<string>();
  const validTasks = candidateTasks.filter((task) => {
    const duplicateKey = `${task.title.toLowerCase()}|${task.startTime.toISOString()}|${task.endTime.toISOString()}`;

    if (seenBatch.has(duplicateKey)) {
      failedRows.push({ rowNumber: task.rowNumber, error: "Duplicate task inside uploaded file" });
      return false;
    }

    seenBatch.add(duplicateKey);

    const existsDuplicate = existing.some(
      (dbTask) =>
        dbTask.title.toLowerCase() === task.title.toLowerCase() &&
        dbTask.startTime.toISOString() === task.startTime.toISOString() &&
        dbTask.endTime.toISOString() === task.endTime.toISOString()
    );

    if (existsDuplicate) {
      failedRows.push({ rowNumber: task.rowNumber, error: "Duplicate task already exists" });
      return false;
    }

    const overlapExists = existing.some((dbTask) =>
      overlaps(task.startTime, task.endTime, dbTask.startTime, dbTask.endTime)
    );

    if (overlapExists) {
      failedRows.push({ rowNumber: task.rowNumber, error: "Task overlaps with an existing task" });
      return false;
    }

    return true;
  });

  if (validTasks.length === 0) {
    return {
      successCount: 0,
      failedRows
    };
  }

  const source = mapSource(parsed.source);
  const userObjectId = new Types.ObjectId(input.userId);
  const profileObjectId = new Types.ObjectId(input.profileId);

  let successCount = 0;

  for (let index = 0; index < validTasks.length; index += BATCH_SIZE) {
    const batch = validTasks.slice(index, index + BATCH_SIZE);

    const docs = batch.map((task) => ({
      userId: userObjectId,
      profileId: profileObjectId,
      title: task.title,
      description: task.description,
      startTime: task.startTime,
      endTime: task.endTime,
      priority: task.priority,
      reminderTime: task.reminderTime,
      source,
      status: "pending" as const
    }));

    const result = await PlannerTaskModel.insertMany(docs, { ordered: false });
    successCount += result.length;
  }

  return {
    successCount,
    failedRows
  };
}

export function assertImportFileExists(file: Express.Multer.File | undefined): asserts file is Express.Multer.File {
  if (!file) {
    throw new AppError("Upload file is required", StatusCodes.BAD_REQUEST);
  }
}
