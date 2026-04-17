import { parse as parseCsv } from "csv-parse/sync";
import * as XLSX from "xlsx";
import { AppError } from "../../../shared/utils/app-error";
import { StatusCodes } from "http-status-codes";

export type PlannerImportSource = "csv" | "json" | "excel";

export interface ParsedImportRow {
  rowNumber: number;
  title?: string;
  description?: string;
  startTime?: string;
  endTime?: string;
  priority?: string;
  reminderTime?: string;
}

const REQUIRED_HEADERS = [
  "title",
  "description",
  "startTime",
  "endTime",
  "priority",
  "reminderTime"
] as const;

export function detectFileSource(file: Express.Multer.File): PlannerImportSource {
  const lowerName = file.originalname.toLowerCase();
  const mime = (file.mimetype || "").toLowerCase();

  if (lowerName.endsWith(".csv") || mime.includes("csv")) {
    return "csv";
  }

  if (lowerName.endsWith(".json") || mime.includes("json")) {
    return "json";
  }

  if (
    lowerName.endsWith(".xlsx") ||
    mime.includes("spreadsheetml") ||
    mime.includes("excel")
  ) {
    return "excel";
  }

  throw new AppError("Unsupported file format. Allowed formats: CSV, JSON, XLSX", StatusCodes.BAD_REQUEST);
}

export function parsePlannerImportFile(file: Express.Multer.File): {
  source: PlannerImportSource;
  rows: ParsedImportRow[];
} {
  const source = detectFileSource(file);

  if (source === "csv") {
    return { source, rows: parseCsvRows(file.buffer) };
  }

  if (source === "json") {
    return { source, rows: parseJsonRows(file.buffer) };
  }

  return { source, rows: parseExcelRows(file.buffer) };
}

function normalizeRow(row: Record<string, unknown>, rowNumber: number): ParsedImportRow {
  const normalized: ParsedImportRow = { rowNumber };

  for (const header of REQUIRED_HEADERS) {
    const rawValue = row[header];
    normalized[header] = typeof rawValue === "string" ? rawValue.trim() : undefined;
  }

  return normalized;
}

function validateHeaders(headers: string[]) {
  const missing = REQUIRED_HEADERS.filter((header) => !headers.includes(header));

  if (missing.length > 0) {
    throw new AppError(
      `Missing required columns: ${missing.join(", ")}. Required format: ${REQUIRED_HEADERS.join(", ")}`,
      StatusCodes.BAD_REQUEST
    );
  }
}

function parseCsvRows(buffer: Buffer): ParsedImportRow[] {
  const content = buffer.toString("utf8");

  const records = parseCsv(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true
  }) as Record<string, unknown>[];

  if (records.length === 0) {
    return [];
  }

  validateHeaders(Object.keys(records[0]));

  return records.map((row, index) => normalizeRow(row, index + 2));
}

function parseJsonRows(buffer: Buffer): ParsedImportRow[] {
  let parsed: unknown;

  try {
    parsed = JSON.parse(buffer.toString("utf8"));
  } catch {
    throw new AppError("Invalid JSON payload", StatusCodes.BAD_REQUEST);
  }

  if (!Array.isArray(parsed)) {
    throw new AppError("JSON import expects an array of task rows", StatusCodes.BAD_REQUEST);
  }

  return parsed.map((entry, index) => {
    if (!entry || typeof entry !== "object") {
      return { rowNumber: index + 1 };
    }

    return normalizeRow(entry as Record<string, unknown>, index + 1);
  });
}

function parseExcelRows(buffer: Buffer): ParsedImportRow[] {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const firstSheetName = workbook.SheetNames[0];

  if (!firstSheetName) {
    throw new AppError("Excel file does not contain any sheet", StatusCodes.BAD_REQUEST);
  }

  const worksheet = workbook.Sheets[firstSheetName];
  const records = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
    defval: ""
  });

  if (records.length === 0) {
    return [];
  }

  validateHeaders(Object.keys(records[0]));

  return records.map((row, index) => normalizeRow(row, index + 2));
}
