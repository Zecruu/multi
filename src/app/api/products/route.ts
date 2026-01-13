import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import connectDB from "@/lib/mongodb";
import Product from "@/models/Product";
import { getStripe } from "@/lib/stripe";
import { logProductAction } from "@/lib/activity-logger";

// Helper to get admin user from session
async function getAdminUser() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("admin_session");
  if (!sessionCookie) return null;
  
  try {
    const sessionData = JSON.parse(Buffer.from(sessionCookie.value, "base64").toString());
    return {
      name: sessionData.name || sessionData.username || "Admin",
      role: sessionData.role || "admin",
    };
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search") || "";
    const category = searchParams.get("category");
    const status = searchParams.get("status");

    const query: Record<string, unknown> = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { sku: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    if (category && category !== "all") {
      query.category = category;
    }

    if (status && status !== "all") {
      query.status = status;
    }

    const skip = (page - 1) * limit;

    const [products, total] = await Promise.all([
      Product.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Product.countDocuments(query),
    ]);

    return NextResponse.json({
      products,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();

    // Generate slug from name if not provided
    if (!body.slug && body.name) {
      let baseSlug = body.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
      
      // Check for duplicate slug and append number if needed
      let slug = baseSlug;
      let counter = 1;
      while (await Product.findOne({ slug })) {
        slug = `${baseSlug}-${counter}`;
        counter++;
      }
      body.slug = slug;
    }

    // Check if SKU already exists
    const existingProduct = await Product.findOne({ sku: body.sku });
    if (existingProduct) {
      return NextResponse.json(
        { error: "A product with this SKU already exists" },
        { status: 400 }
      );
    }

    // Create Stripe product and price
    let stripeProductId: string | undefined;
    let stripePriceId: string | undefined;

    if (body.status === "active") {
      try {
        const stripe = getStripe();
        const stripeProduct = await stripe.products.create({
          name: body.name,
          description: body.description,
          metadata: {
            sku: body.sku,
          },
        });

        const stripePrice = await stripe.prices.create({
          product: stripeProduct.id,
          unit_amount: Math.round(body.price * 100),
          currency: "usd",
        });

        stripeProductId = stripeProduct.id;
        stripePriceId = stripePrice.id;
      } catch (stripeError) {
        console.error("Stripe error:", stripeError);
        // Continue without Stripe integration if it fails
      }
    }

    const product = await Product.create({
      ...body,
      stripeProductId,
      stripePriceId,
    });

    // Log activity
    const adminUser = await getAdminUser();
    if (adminUser) {
      await logProductAction(
        "created",
        product.name,
        product._id.toString(),
        adminUser.name,
        adminUser.role,
        `Product "${product.name}" (SKU: ${product.sku}) created`,
        { sku: product.sku, price: product.price, status: product.status }
      );
    }

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error("Error creating product:", error);
    return NextResponse.json(
      { error: "Failed to create product" },
      { status: 500 }
    );
  }
}
