import mongoose, { Schema, Document, Model } from "mongoose";

export type SparkyActionType = "delete" | "archive";
export type SparkyActionStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "executed"
  | "failed";

export interface ISparkyAction extends Document {
  _id: mongoose.Types.ObjectId;
  actionType: SparkyActionType;
  filter: {
    query?: string;
    category?: string;
    status?: string;
  };
  productIds: mongoose.Types.ObjectId[];
  matchCount: number;
  summary: string;
  createdBy: string;
  status: SparkyActionStatus;
  executedAt?: Date;
  executedBy?: string;
  resultMessage?: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SparkyActionSchema = new Schema<ISparkyAction>(
  {
    actionType: {
      type: String,
      enum: ["delete", "archive"],
      required: true,
    },
    filter: {
      query: { type: String },
      category: { type: String },
      status: { type: String },
    },
    productIds: [{ type: Schema.Types.ObjectId, ref: "Product" }],
    matchCount: { type: Number, required: true },
    summary: { type: String, required: true },
    createdBy: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "executed", "failed"],
      default: "pending",
      index: true,
    },
    executedAt: { type: Date },
    executedBy: { type: String },
    resultMessage: { type: String },
    // Auto-expire after 1 hour so stale pending actions don't linger.
    expiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 60 * 60 * 1000),
    },
  },
  { timestamps: true }
);

SparkyActionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
SparkyActionSchema.index({ status: 1, createdAt: -1 });

const SparkyAction: Model<ISparkyAction> =
  mongoose.models.SparkyAction ||
  mongoose.model<ISparkyAction>("SparkyAction", SparkyActionSchema);

export default SparkyAction;
