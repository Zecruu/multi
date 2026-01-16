import { MetadataRoute } from "next";
import connectDB from "@/lib/mongodb";
import Product from "@/models/Product";
import Category from "@/models/Category";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://multielectricsupply.com";

/**
 * AUTOMATIC SITEMAP GENERATION
 * 
 * This sitemap is automatically generated and includes:
 * - All active products (auto-updated when products are created/modified)
 * - All active categories
 * - Static pages (home, products, cart, etc.)
 * 
 * Google will crawl this sitemap to discover all your products.
 * Submit this sitemap URL to Google Search Console: https://multielectricsupply.com/sitemap.xml
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/store`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/store/products`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/store/cart`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/store/login`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/store/register`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
  ];

  // Fetch all active products from database
  let productPages: MetadataRoute.Sitemap = [];
  try {
    await connectDB();
    
    const products = await Product.find({ status: "active" })
      .select("slug updatedAt createdAt")
      .lean();

    productPages = products.map((product: { slug: string; updatedAt?: Date; createdAt?: Date }) => ({
      url: `${BASE_URL}/store/products/${product.slug}`,
      lastModified: product.updatedAt || product.createdAt || new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));

    console.log(`[Sitemap] Generated ${productPages.length} product URLs`);
  } catch (error) {
    console.error("[Sitemap] Error fetching products:", error);
  }

  // Fetch all active categories
  let categoryPages: MetadataRoute.Sitemap = [];
  try {
    const categories = await Category.find({ isActive: true })
      .select("slug updatedAt")
      .lean();

    categoryPages = categories.map((category: { slug: string; updatedAt?: Date }) => ({
      url: `${BASE_URL}/store/products?category=${category.slug}`,
      lastModified: category.updatedAt || new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }));

    console.log(`[Sitemap] Generated ${categoryPages.length} category URLs`);
  } catch (error) {
    console.error("[Sitemap] Error fetching categories:", error);
  }

  // Combine all pages
  return [...staticPages, ...productPages, ...categoryPages];
}
