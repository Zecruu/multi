import mongoose, { Schema, Document, Model } from "mongoose";

export interface IActivityLog extends Document {
  _id: mongoose.Types.ObjectId;
  action: string;
  category: "order" | "product" | "client" | "user" | "settings" | "system";
  description: string;
  userId?: mongoose.Types.ObjectId;
  userName: string;
  userRole: string;
  targetId?: string;
  targetType?: string;
  targetName?: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  createdAt: Date;
}

const ActivityLogSchema = new Schema<IActivityLog>(
  {
    action: { type: String, required: true }, // e.g., "created", "updated", "deleted", "status_changed"
    category: {
      type: String,
      enum: ["order", "product", "client", "user", "settings", "system"],
      required: true,
    },
    description: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    userName: { type: String, required: true },
    userRole: { type: String, required: true },
    targetId: { type: String }, // ID of the affected resource
    targetType: { type: String }, // e.g., "Order", "Product"
    targetName: { type: String }, // e.g., order number, product name
    metadata: { type: Schema.Types.Mixed }, // Additional data
    ipAddress: { type: String },
  },
  {
    timestamps: true,
  }
);

ActivityLogSchema.index({ createdAt: -1 });
ActivityLogSchema.index({ category: 1 });
ActivityLogSchema.index({ userId: 1 });
ActivityLogSchema.index({ action: 1 });

const ActivityLog: Model<IActivityLog> =
  mongoose.models.ActivityLog || mongoose.model<IActivityLog>("ActivityLog", ActivityLogSchema);

export default ActivityLog;

