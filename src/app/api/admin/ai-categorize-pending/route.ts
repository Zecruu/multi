import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { GoogleGenAI, Type } from "@google/genai";
import connectDB from "@/lib/mongodb";
import Product from "@/models/Product";
import Category from "@/models/Category";
import ActivityLog from "@/models/ActivityLog";

export const maxDuration = 60;

const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";

async function requireAdmin() {
  const sessionCookie = (await cookies()).get("admin_session");
  if (!sessionCookie) return false;
  try {
    const data = JSON.parse(Buffer.from(sessionCookie.value, "base64").toString());
    return data.role === "admin";
  } catch {
    return false;
  }
}

type TaxonomyOption = { name: string; slug: string };

async function loadTaxonomy(): Promise<{
  children: TaxonomyOption[];
  brandChildren: TaxonomyOption[];
}> {
  const all = await Category.find({ isActive: true })
    .select("name slug parentId")
    .lean();
  const parents = all.filter((c) => !c.parentId);
  const brandParent = parents.find((p) => p.slug === "shop-by-brand");
  const brandParentId = brandParent ? String(brandParent._id) : null;
  const children = all
    .filter((c) => c.parentId)
    .map((c) => ({ name: c.name, slug: c.slug, parentId: String(c.parentId) }));
  const brandChildren = brandParentId
    ? children.filter((c) => c.parentId === brandParentId)
    : [];
  const nonBrand = children.filter(
    (c) => !brandParentId || c.parentId !== brandParentId
  );
  return {
    children: nonBrand.map((c) => ({ name: c.name, slug: c.slug })),
    brandChildren: brandChildren.map((c) => ({ name: c.name, slug: c.slug })),
  };
}

export async function POST(request: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY not configured" },
      { status: 500 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const limit = Math.min(Math.max(Number(body.limit ?? 50), 1), 200);

  await connectDB();

  const pending = await Product.find({ needsAiCategorize: true })
    .select("_id name sku description brand rmsDepartment")
    .limit(limit)
    .lean();

  if (pending.length === 0) {
    return NextResponse.json({ processed: 0, remaining: 0, results: [] });
  }

  const { children, brandChildren } = await loadTaxonomy();
  const allCategorySlugs = new Set(children.map((c) => c.slug));
  const allBrandSlugs = new Set(brandChildren.map((c) => c.slug));

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `You are categorizing MultiElectric Supply products into our storefront taxonomy.

Taxonomy (pick exactly ONE category slug per product from this list):
${children.map((c) => `- ${c.slug} — ${c.name}`).join("\n")}

Brand options (optional — pick at most ONE if the product is clearly from a listed brand):
${brandChildren.map((c) => `- ${c.slug} — ${c.name}`).join("\n")}

Products to categorize (JSON):
${JSON.stringify(
  pending.map((p) => ({
    sku: p.sku,
    name: p.name,
    description: (p.description || "").slice(0, 300),
    brand: p.brand || null,
    rmsDepartment: p.rmsDepartment || null,
  })),
  null,
  2
)}

Return a JSON array with one object per product in the same order, shape:
{ "sku": "...", "category": "<slug>", "brand": "<slug>" | null, "reason": "<one short sentence>" }`;

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            sku: { type: Type.STRING },
            category: { type: Type.STRING },
            brand: { type: Type.STRING, nullable: true },
            reason: { type: Type.STRING },
          },
          required: ["sku", "category"],
        },
      },
    },
  });

  const text =
    response.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("") ||
    "[]";

  let classifications: Array<{
    sku: string;
    category: string;
    brand?: string | null;
    reason?: string;
  }> = [];
  try {
    classifications = JSON.parse(text);
  } catch {
    return NextResponse.json(
      { error: "AI returned invalid JSON", raw: text.slice(0, 500) },
      { status: 502 }
    );
  }

  const bulk: Array<{
    updateOne: {
      filter: { sku: string };
      update: { $set: Record<string, unknown> };
    };
  }> = [];
  const applied: typeof classifications = [];
  const rejected: Array<{ sku: string; reason: string }> = [];

  for (const c of classifications) {
    if (!allCategorySlugs.has(c.category)) {
      rejected.push({ sku: c.sku, reason: `unknown category slug: ${c.category}` });
      continue;
    }
    const cats = new Set<string>([c.category]);
    if (c.brand && allBrandSlugs.has(c.brand)) cats.add(c.brand);
    bulk.push({
      updateOne: {
        filter: { sku: c.sku },
        update: {
          $set: {
            category: c.category,
            categories: Array.from(cats),
            needsAiCategorize: false,
          },
        },
      },
    });
    applied.push(c);
  }

  if (bulk.length > 0) {
    await Product.bulkWrite(bulk, { ordered: false });

    // Best-effort audit trail so the admin "Imports" tab can show Sparky's work.
    try {
      await ActivityLog.insertMany(
        applied.map((c) => ({
          action: "categorized",
          category: "product" as const,
          description: `Sparky categorized ${c.sku} → ${c.category}${
            c.brand ? ` (${c.brand})` : ""
          }`,
          userName: "Sparky",
          userRole: "ai",
          targetId: c.sku,
          targetType: "Product",
          targetName: c.sku,
          metadata: {
            source: "sparky",
            tool: "categorize_pending",
            category: c.category,
            brand: c.brand || null,
            reason: c.reason || null,
          },
        })),
        { ordered: false }
      );
    } catch (err) {
      console.error("[ai-categorize] activity log failed", err);
    }
  }

  const remaining = await Product.countDocuments({ needsAiCategorize: true });

  return NextResponse.json({
    processed: applied.length,
    remaining,
    rejected,
    results: applied,
  });
}
