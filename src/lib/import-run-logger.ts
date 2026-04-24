import ImportRun, {
  IImportRunError,
  IImportRunProduct,
  ImportRunSource,
  ImportRunStatus,
} from "@/models/ImportRun";

export interface LogImportRunInput {
  source: ImportRunSource;
  agentVersion?: string;
  adminUserName?: string;
  fileName?: string;
  fileSize?: number;
  totalRows: number;
  created: number;
  updated: number;
  unchanged?: number;
  skipped: number;
  pendingAiCategorize?: number;
  errors: IImportRunError[];
  products: IImportRunProduct[];
  startedAt: Date;
}

const MAX_PRODUCTS_STORED = 2000;
const MAX_ERRORS_STORED = 200;

export async function logImportRun(input: LogImportRunInput) {
  const finishedAt = new Date();
  const durationMs = finishedAt.getTime() - input.startedAt.getTime();

  const status: ImportRunStatus = deriveStatus(input);

  try {
    await ImportRun.create({
      source: input.source,
      status,
      agentVersion: input.agentVersion,
      adminUserName: input.adminUserName,
      fileName: input.fileName,
      fileSize: input.fileSize,
      totalRows: input.totalRows,
      created: input.created,
      updated: input.updated,
      unchanged: input.unchanged ?? 0,
      skipped: input.skipped,
      pendingAiCategorize: input.pendingAiCategorize ?? 0,
      totalErrors: input.errors.length,
      errorList: input.errors.slice(0, MAX_ERRORS_STORED),
      products: input.products.slice(0, MAX_PRODUCTS_STORED),
      durationMs,
      startedAt: input.startedAt,
      finishedAt,
    });
  } catch (err) {
    console.error("[import-run-logger] failed to persist import run", err);
  }
}

function deriveStatus(input: LogImportRunInput): ImportRunStatus {
  if (input.totalRows === 0) return "failed";
  const attempted = input.totalRows;
  const errorRate = input.errors.length / Math.max(attempted, 1);
  if (errorRate >= 0.5) return "failed";
  if (input.errors.length > 0 || input.skipped > 0) return "partial";
  return "success";
}
