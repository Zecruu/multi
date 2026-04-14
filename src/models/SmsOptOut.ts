import mongoose, { Schema, Document, Model } from "mongoose";

export interface ISmsOptOut extends Document {
  _id: mongoose.Types.ObjectId;
  phoneDigits: string; // digits only
  reason?: string;
  createdAt: Date;
}

const SmsOptOutSchema = new Schema<ISmsOptOut>(
  {
    phoneDigits: { type: String, required: true, unique: true, index: true },
    reason: { type: String, default: "customer_stop" },
  },
  { timestamps: true }
);

const SmsOptOut: Model<ISmsOptOut> =
  mongoose.models.SmsOptOut ||
  mongoose.model<ISmsOptOut>("SmsOptOut", SmsOptOutSchema);

export default SmsOptOut;
