import mongoose, { Schema, Document, Model } from "mongoose";

export interface ILedgerEntry extends Document {
  _id: mongoose.Types.ObjectId;
  type: "income" | "expense" | "refund" | "adjustment";
  category: string;
  description: string;
  amount: number;
  reference?: {
    type: "order" | "client" | "product" | "other";
    id?: mongoose.Types.ObjectId;
    orderNumber?: string;
  };
  paymentMethod?: string;
  stripeTransactionId?: string;
  notes?: string;
  createdBy?: mongoose.Types.ObjectId;
  date: Date;
  createdAt: Date;
  updatedAt: Date;
}

const LedgerEntrySchema = new Schema<ILedgerEntry>(
  {
    type: {
      type: String,
      enum: ["income", "expense", "refund", "adjustment"],
      required: true,
    },
    category: { type: String, required: true },
    description: { type: String, required: true },
    amount: { type: Number, required: true },
    reference: {
      type: {
        type: String,
        enum: ["order", "client", "product", "other"],
      },
      id: { type: Schema.Types.ObjectId },
      orderNumber: { type: String },
    },
    paymentMethod: { type: String },
    stripeTransactionId: { type: String },
    notes: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    date: { type: Date, required: true, default: Date.now },
  },
  {
    timestamps: true,
  }
);

LedgerEntrySchema.index({ type: 1 });
LedgerEntrySchema.index({ category: 1 });
LedgerEntrySchema.index({ date: -1 });
LedgerEntrySchema.index({ "reference.orderNumber": 1 });

const LedgerEntry: Model<ILedgerEntry> =
  mongoose.models.LedgerEntry || mongoose.model<ILedgerEntry>("LedgerEntry", LedgerEntrySchema);

export default LedgerEntry;
