import mongoose, { Schema, Document, Model } from "mongoose";

export type ReviewStatus =
  | "sent"
  | "rated_positive"
  | "rated_negative"
  | "followed_up"
  | "opted_out"
  | "expired";

export interface IReviewMessage {
  role: "bot" | "customer";
  content: string;
  timestamp: Date;
}

export interface IReviewRequest extends Document {
  _id: mongoose.Types.ObjectId;
  firstName: string;
  phone: string; // E.164 (+1...)
  phoneDigits: string; // just digits, for flexible matching
  language: "es" | "en";
  status: ReviewStatus;
  rating?: number | null;
  sentimentSource?: "digit" | "keyword" | "ai" | "manual";
  feedbackText?: string | null; // raw customer reply for low ratings
  conversation: IReviewMessage[];
  sentBy: string; // admin username
  provider: "aws" | "preview";
  sentAt: Date;
  respondedAt?: Date | null;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema = new Schema<IReviewMessage>(
  {
    role: { type: String, enum: ["bot", "customer"], required: true },
    content: { type: String, required: true },
    timestamp: { type: Date, default: () => new Date() },
  },
  { _id: false }
);

const ReviewRequestSchema = new Schema<IReviewRequest>(
  {
    firstName: { type: String, required: true, trim: true },
    phone: { type: String, required: true },
    phoneDigits: { type: String, required: true, index: true },
    language: { type: String, enum: ["es", "en"], default: "es" },
    status: {
      type: String,
      enum: [
        "sent",
        "rated_positive",
        "rated_negative",
        "followed_up",
        "opted_out",
        "expired",
      ],
      default: "sent",
      index: true,
    },
    rating: { type: Number, min: 1, max: 5, default: null },
    sentimentSource: {
      type: String,
      enum: ["digit", "keyword", "ai", "manual"],
    },
    feedbackText: { type: String, default: null },
    conversation: { type: [MessageSchema], default: [] },
    sentBy: { type: String, default: "admin" },
    provider: { type: String, enum: ["aws", "preview"], default: "preview" },
    sentAt: { type: Date, default: () => new Date() },
    respondedAt: { type: Date, default: null },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    },
  },
  { timestamps: true }
);

// TTL: auto-cleanup after expiresAt
ReviewRequestSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
ReviewRequestSchema.index({ phoneDigits: 1, status: 1 });

const ReviewRequest: Model<IReviewRequest> =
  mongoose.models.ReviewRequest ||
  mongoose.model<IReviewRequest>("ReviewRequest", ReviewRequestSchema);

export default ReviewRequest;
