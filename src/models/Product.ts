import mongoose, { Schema, Document, Model } from "mongoose";

export interface IProductImage {
  url: string;
  key: string;
  alt?: string;
  isPrimary: boolean;
}

export interface IProduct extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  slug: string;
  sku: string;
  description: string;
  shortDescription?: string;
  category: string;
  subcategory?: string;
  brand?: string;
  images: IProductImage[];
  price: number;
  compareAtPrice?: number;
  costPrice?: number;
  isOnSale?: boolean;
  salePrice?: number;
  quantity: number;
  lowStockThreshold: number;
  unit: string;
  weight?: number;
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
  };
  specifications?: Map<string, string>;
  tags?: string[];
  status: "active" | "draft" | "archived";
  isFeatured: boolean;
  stripeProductId?: string;
  stripePriceId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ProductImageSchema = new Schema<IProductImage>(
  {
    url: { type: String, required: true },
    key: { type: String, required: true },
    alt: { type: String },
    isPrimary: { type: Boolean, default: false },
  },
  { _id: false }
);

const ProductSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    sku: { type: String, required: true, unique: true, uppercase: true },
    description: { type: String, required: true },
    shortDescription: { type: String },
    category: { type: String, required: true },
    subcategory: { type: String },
    brand: { type: String },
    images: [ProductImageSchema],
    price: { type: Number, required: true, min: 0 },
    compareAtPrice: { type: Number, min: 0 },
    costPrice: { type: Number, min: 0 },
    isOnSale: { type: Boolean, default: false },
    salePrice: { type: Number, min: 0 },
    quantity: { type: Number, required: true, default: 0, min: 0 },
    lowStockThreshold: { type: Number, default: 10 },
    unit: { type: String, default: "piece" },
    weight: { type: Number },
    dimensions: {
      length: { type: Number },
      width: { type: Number },
      height: { type: Number },
    },
    specifications: { type: Map, of: String },
    tags: [{ type: String }],
    status: {
      type: String,
      enum: ["active", "draft", "archived"],
      default: "draft",
    },
    isFeatured: { type: Boolean, default: false },
    stripeProductId: { type: String },
    stripePriceId: { type: String },
  },
  {
    timestamps: true,
  }
);

ProductSchema.index({ name: "text", description: "text", sku: "text" });
ProductSchema.index({ category: 1, subcategory: 1 });
ProductSchema.index({ status: 1 });
ProductSchema.index({ slug: 1 });
ProductSchema.index({ sku: 1 });

ProductSchema.pre("save", function (next) {
  if (this.isModified("name") && !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }
  next();
});

const Product: Model<IProduct> =
  mongoose.models.Product || mongoose.model<IProduct>("Product", ProductSchema);

export default Product;
