import mongoose, { Schema, Document, Model } from "mongoose";

export type ImportRunSource = "sync-agent" | "admin-ui";
export type ImportRunStatus = "success" | "partial" | "failed";

export interface IImportRunProduct {
  sku: string;
  name?: string;
  action: "created" | "updated" | "unchanged";
  category?: string;
  needsAiCategorize?: boolean;
}

export interface IImportRunError {
  row: number;
  sku: string;
  error: string;
}

export interface IImportRun extends Document {
  _id: mongoose.Types.ObjectId;
  source: ImportRunSource;
  status: ImportRunStatus;
  agentVersion?: string;
  adminUserName?: string;
  fileName?: string;
  fileSize?: number;
  totalRows: number;
  created: number;
  updated: number;
  skipped: number;
  pendingAiCategorize: number;
  totalErrors: number;
  errorList: IImportRunError[];
  products: IImportRunProduct[];
  durationMs?: number;
  startedAt: Date;
  finishedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ImportRunProductSchema = new Schema<IImportRunProduct>(
  {
    sku: { type: String, required: true },
    name: { type: String },
    action: {
      type: String,
      enum: ["created", "updated", "unchanged"],
      required: true,
    },
    category: { type: String },
    needsAiCategorize: { type: Boolean },
  },
  { _id: false }
);

const ImportRunErrorSchema = new Schema<IImportRunError>(
  {
    row: { type: Number, required: true },
    sku: { type: String, required: true },
    error: { type: String, required: true },
  },
  { _id: false }
);

const ImportRunSchema = new Schema<IImportRun>(
  {
    source: {
      type: String,
      enum: ["sync-agent", "admin-ui"],
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["success", "partial", "failed"],
      required: true,
    },
    agentVersion: { type: String },
    adminUserName: { type: String },
    fileName: { type: String },
    fileSize: { type: Number },
    totalRows: { type: Number, default: 0 },
    created: { type: Number, default: 0 },
    updated: { type: Number, default: 0 },
    skipped: { type: Number, default: 0 },
    pendingAiCategorize: { type: Number, default: 0 },
    totalErrors: { type: Number, default: 0 },
    errorList: { type: [ImportRunErrorSchema], default: [] },
    products: { type: [ImportRunProductSchema], default: [] },
    durationMs: { type: Number },
    startedAt: { type: Date, required: true },
    finishedAt: { type: Date, required: true },
  },
  { timestamps: true }
);

ImportRunSchema.index({ startedAt: -1 });
ImportRunSchema.index({ source: 1, startedAt: -1 });

const ImportRun: Model<IImportRun> =
  mongoose.models.ImportRun ||
  mongoose.model<IImportRun>("ImportRun", ImportRunSchema);

export default ImportRun;
