import { Metadata } from "next";
import { notFound } from "next/navigation";
import connectDB from "@/lib/mongodb";
import Product from "@/models/Product";
import ProductClient from "./product-client";

// Base URL for the site
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://multielectricsupply.com";

interface ProductData {
  _id: string;
  name: string;
  nameEs?: string;
  slug: string;
  sku: string;
  description: string;
  descriptionEs?: string;
  shortDescription?: string;
  shortDescriptionEs?: string;
  price: number;
  compareAtPrice?: number;
  isOnSale?: boolean;
  salePrice?: number;
  images: { url: string; key: string; isPrimary: boolean }[];
  category: string;
  brand?: string;
  quantity: number;
  status: string;
  unit: string;
  specifications?: Record<string, string>;
  isFeatured?: boolean;
}

// Fetch product data for metadata and page
async function getProduct(slug: string): Promise<ProductData | null> {
  try {
    await connectDB();
    const product = await Product.findOne({ slug, status: "active" }).lean();
    if (!product) return null;
    
    // Convert MongoDB document to plain object
    return JSON.parse(JSON.stringify(product));
  } catch (error) {
    console.error("Error fetching product for metadata:", error);
    return null;
  }
}

// Generate dynamic metadata for SEO - THIS RUNS AUTOMATICALLY FOR EACH PRODUCT
export async function generateMetadata({ 
  params 
}: { 
  params: Promise<{ slug: string }> 
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);

  if (!product) {
    return {
      title: "Product Not Found",
      description: "The requested product could not be found.",
    };
  }

  // Get the primary image or first image
  const primaryImage = product.images?.find((img) => img.isPrimary)?.url 
    || product.images?.[0]?.url 
    || `${BASE_URL}/logo.jpg`;

  // Calculate the display price
  const hasValidSale = product.isOnSale && product.salePrice && product.salePrice < product.price;
  const displayPrice = hasValidSale ? product.salePrice! : product.price;

  // Create SEO-optimized description (max 160 chars for Google)
  const seoDescription = product.shortDescription 
    || product.description?.substring(0, 157) + "..."
    || `Shop ${product.name} at MultiElectric Supply. Professional-grade electrical supplies.`;

  // Generate keywords from product data
  const keywords = [
    product.name,
    product.category,
    product.brand,
    product.sku,
    "electrical supplies",
    "MultiElectric Supply",
    "buy online",
  ].filter(Boolean).join(", ");

  return {
    title: `${product.name} | MultiElectric Supply`,
    description: seoDescription,
    keywords: keywords,
    openGraph: {
      title: `${product.name} - $${displayPrice.toFixed(2)}`,
      description: seoDescription,
      url: `${BASE_URL}/store/products/${product.slug}`,
      siteName: "MultiElectric Supply",
      images: [
        {
          url: primaryImage,
          width: 800,
          height: 800,
          alt: product.name,
        },
      ],
      locale: "en_US",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${product.name} - $${displayPrice.toFixed(2)}`,
      description: seoDescription,
      images: [primaryImage],
    },
    alternates: {
      canonical: `${BASE_URL}/store/products/${product.slug}`,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
  };
}

// JSON-LD Structured Data Component for Google Rich Results
function ProductJsonLd({ product }: { product: ProductData }) {
  const primaryImage = product.images?.find((img) => img.isPrimary)?.url 
    || product.images?.[0]?.url;
  
  const hasValidSale = product.isOnSale && product.salePrice && product.salePrice < product.price;
  const displayPrice = hasValidSale ? product.salePrice! : product.price;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    sku: product.sku,
    image: product.images?.map(img => img.url) || [],
    brand: product.brand ? {
      "@type": "Brand",
      name: product.brand,
    } : undefined,
    category: product.category,
    offers: {
      "@type": "Offer",
      url: `${BASE_URL}/store/products/${product.slug}`,
      priceCurrency: "USD",
      price: displayPrice.toFixed(2),
      priceValidUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      availability: product.quantity > 0 
        ? "https://schema.org/InStock" 
        : "https://schema.org/OutOfStock",
      seller: {
        "@type": "Organization",
        name: "MultiElectric Supply",
      },
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

// Breadcrumb JSON-LD for better navigation in search results
function BreadcrumbJsonLd({ product }: { product: ProductData }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: BASE_URL,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Products",
        item: `${BASE_URL}/store/products`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: product.category,
        item: `${BASE_URL}/store/products?category=${product.category.toLowerCase()}`,
      },
      {
        "@type": "ListItem",
        position: 4,
        name: product.name,
        item: `${BASE_URL}/store/products/${product.slug}`,
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

// Main Page Component
export default async function ProductPage({ 
  params 
}: { 
  params: Promise<{ slug: string }> 
}) {
  const { slug } = await params;
  const product = await getProduct(slug);

  if (!product) {
    notFound();
  }

  return (
    <>
      {/* JSON-LD Structured Data for Google */}
      <ProductJsonLd product={product} />
      <BreadcrumbJsonLd product={product} />
      
      {/* Client Component for Interactive Features */}
      <ProductClient initialProduct={product} slug={slug} />
    </>
  );
}
