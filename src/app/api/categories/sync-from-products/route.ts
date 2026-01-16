import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Product from "@/models/Product";
import Category from "@/models/Category";

// POST - Sync categories from imported products
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    // Get all unique category names from products
    const uniqueCategories = await Product.distinct("category");
    
    console.log(`[Sync] Found ${uniqueCategories.length} unique categories in products`);

    let created = 0;
    let existing = 0;
    const newCategories: string[] = [];

    // Create categories that don't exist
    for (const categoryName of uniqueCategories) {
      if (!categoryName || categoryName === "Uncategorized") {
        continue;
      }

      // Generate slug
      const slug = categoryName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

      // Check if category already exists (by slug or name)
      const existingCategory = await Category.findOne({
        $or: [{ slug }, { name: categoryName }],
      });

      if (existingCategory) {
        existing++;
        continue;
      }

      // Create new category
      try {
        await Category.create({
          name: categoryName,
          slug,
          description: `Products in the ${categoryName} department`,
          icon: getCategoryIcon(categoryName),
          color: getCategoryColor(categoryName),
          isActive: true,
          sortOrder: created,
        });
        created++;
        newCategories.push(categoryName);
        console.log(`[Sync] Created category: ${categoryName}`);
      } catch (createError: any) {
        // Handle duplicate key error gracefully
        if (createError.code === 11000) {
          existing++;
        } else {
          console.error(`[Sync] Error creating category ${categoryName}:`, createError);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Sync complete: ${created} new categories created, ${existing} already existed`,
      created,
      existing,
      total: uniqueCategories.length,
      newCategories,
    });
  } catch (error) {
    console.error("[Sync] Error syncing categories:", error);
    return NextResponse.json(
      { error: "Failed to sync categories" },
      { status: 500 }
    );
  }
}

// GET - Preview categories that would be created
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    // Get all unique category names from products
    const uniqueCategories = await Product.distinct("category");
    
    // Get existing category slugs
    const existingCategories = await Category.find({}).select("name slug");
    const existingSlugs = new Set(existingCategories.map(c => c.slug));
    const existingNames = new Set(existingCategories.map(c => c.name));

    // Find categories that need to be created
    const missingCategories: string[] = [];
    
    for (const categoryName of uniqueCategories) {
      if (!categoryName || categoryName === "Uncategorized") {
        continue;
      }

      const slug = categoryName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

      if (!existingSlugs.has(slug) && !existingNames.has(categoryName)) {
        missingCategories.push(categoryName);
      }
    }

    return NextResponse.json({
      totalInProducts: uniqueCategories.length,
      existingCategories: existingCategories.length,
      missingCategories: missingCategories.length,
      missing: missingCategories,
    });
  } catch (error) {
    console.error("[Sync] Error checking categories:", error);
    return NextResponse.json(
      { error: "Failed to check categories" },
      { status: 500 }
    );
  }
}

// Helper function to assign icons based on category name
function getCategoryIcon(categoryName: string): string {
  const name = categoryName.toLowerCase();
  
  if (name.includes("wire") || name.includes("wiring") || name.includes("cable")) {
    return "🔌";
  }
  if (name.includes("light") || name.includes("lamp") || name.includes("bulb")) {
    return "💡";
  }
  if (name.includes("switch") || name.includes("outlet") || name.includes("receptacle")) {
    return "🔘";
  }
  if (name.includes("panel") || name.includes("breaker") || name.includes("fuse")) {
    return "⚡";
  }
  if (name.includes("conduit") || name.includes("pipe") || name.includes("tube")) {
    return "🔧";
  }
  if (name.includes("box") || name.includes("enclosure")) {
    return "📦";
  }
  if (name.includes("tool")) {
    return "🛠️";
  }
  if (name.includes("motor") || name.includes("pump")) {
    return "⚙️";
  }
  if (name.includes("ge") || name.includes("disconnect") || name.includes("safety")) {
    return "🔒";
  }
  if (name.includes("meter") || name.includes("test")) {
    return "📊";
  }
  
  return "📁"; // Default icon
}

// Helper function to assign colors based on category name
function getCategoryColor(categoryName: string): string {
  const name = categoryName.toLowerCase();
  
  if (name.includes("wire") || name.includes("wiring") || name.includes("cable")) {
    return "bg-orange-500/10 text-orange-500";
  }
  if (name.includes("light") || name.includes("lamp")) {
    return "bg-yellow-500/10 text-yellow-500";
  }
  if (name.includes("switch") || name.includes("outlet")) {
    return "bg-blue-500/10 text-blue-500";
  }
  if (name.includes("panel") || name.includes("breaker")) {
    return "bg-red-500/10 text-red-500";
  }
  if (name.includes("conduit") || name.includes("pipe")) {
    return "bg-gray-500/10 text-gray-500";
  }
  if (name.includes("ge")) {
    return "bg-purple-500/10 text-purple-500";
  }
  
  return "bg-cyan-500/10 text-cyan-500"; // Default color
}
