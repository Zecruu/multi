import mongoose, { Schema, Document, Model } from "mongoose";

// Singleton settings doc for the sync agent integration.
// Persist the key in Mongo so admin UI rotation flows don't require
// touching Vercel env vars.
export interface ISyncSettings extends Document {
  _id: mongoose.Types.ObjectId;
  syncKey: string;
  rotatedBy?: string;
  rotatedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SyncSettingsSchema = new Schema<ISyncSettings>(
  {
    syncKey: { type: String, required: true },
    rotatedBy: { type: String },
    rotatedAt: { type: Date, default: () => new Date() },
  },
  { timestamps: true }
);

const SyncSettings: Model<ISyncSettings> =
  mongoose.models.SyncSettings ||
  mongoose.model<ISyncSettings>("SyncSettings", SyncSettingsSchema);

export default SyncSettings;
