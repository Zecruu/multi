import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { GoogleGenAI, Type, FunctionCallingConfigMode } from "@google/genai";
import connectDB from "@/lib/mongodb";
import Product from "@/models/Product";
import Category from "@/models/Category";
import SparkyAction from "@/models/SparkyAction";

const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";
const MAX_TURNS = 8;

async function requireAdmin(): Promise<{ name: string; role: string } | null> {
  const sessionCookie = (await cookies()).get("admin_session");
  if (!sessionCookie) return null;
  try {
    const data = JSON.parse(Buffer.from(sessionCookie.value, "base64").toString());
    if (data.role !== "admin") return null;
    return {
      name: data.name || data.username || "Admin",
      role: data.role,
    };
  } catch {
    return null;
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Tool implementations — every tool returns a JSON-stringifiable object.
// ──────────────────────────────────────────────────────────────────────────────

async function tool_searchProducts(args: {
  query?: string;
  category?: string;
  status?: string;
  limit?: number;
}) {
  const { query, category, status, limit = 25 } = args;
  const mongoQuery: Record<string, unknown> = {};
  if (query) {
    mongoQuery.$or = [
      { name: { $regex: query, $options: "i" } },
      { sku: { $regex: query, $options: "i" } },
    ];
  }
  if (category && category !== "all") {
    mongoQuery.$or = [
      ...((mongoQuery.$or as object[]) || []),
      { category },
      { categories: category },
    ];
  }
  if (status && status !== "all") mongoQuery.status = status;

  const effectiveLimit = Math.min(Math.max(limit, 1), 200);

  const [total, docs] = await Promise.all([
    Product.countDocuments(mongoQuery),
    Product.find(mongoQuery)
      .select("_id name sku price quantity status category categories brand isOnSale salePrice")
      .limit(effectiveLimit)
      .lean(),
  ]);

  // Build a URL the user can click to open the admin products page with
  // the same filter applied — useful when `total` exceeds what fits in a
  // chat response.
  const urlParams = new URLSearchParams();
  if (query) urlParams.set("search", query);
  if (category && category !== "all") urlParams.set("category", category);
  if (status && status !== "all") urlParams.set("status", status);
  const productsPageUrl = `/admin/products${
    urlParams.toString() ? `?${urlParams.toString()}` : ""
  }`;

  return {
    total,
    returned: docs.length,
    truncated: total > docs.length,
    productsPageUrl,
    products: docs.map((d) => ({
      id: String(d._id),
      name: d.name,
      sku: d.sku,
      price: d.price,
      salePrice: d.isOnSale ? d.salePrice : undefined,
      quantity: d.quantity,
      status: d.status,
      category: d.category,
      categories: d.categories,
      brand: d.brand,
    })),
  };
}

async function tool_updateProduct(args: {
  id?: string;
  sku?: string;
  price?: number;
  salePrice?: number | null;
  isOnSale?: boolean;
  quantity?: number;
  status?: "active" | "draft" | "archived";
  category?: string;
  categories?: string[];
}) {
  const { id, sku, ...update } = args;
  const filter = id ? { _id: id } : sku ? { sku: sku.toUpperCase() } : null;
  if (!filter) return { ok: false, error: "must provide id or sku" };
  const cleaned: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(update)) {
    if (v !== undefined) cleaned[k] = v;
  }
  if (Object.keys(cleaned).length === 0) return { ok: false, error: "no fields to update" };
  const doc = await Product.findOneAndUpdate(filter, { $set: cleaned }, { new: true })
    .select("_id name sku price quantity status")
    .lean();
  if (!doc) return { ok: false, error: "product not found" };
  return { ok: true, product: { id: String(doc._id), ...doc, _id: undefined } };
}

async function tool_adjustStock(args: { sku: string; delta: number }) {
  const doc = await Product.findOneAndUpdate(
    { sku: args.sku.toUpperCase() },
    { $inc: { quantity: args.delta } },
    { new: true }
  )
    .select("sku quantity")
    .lean();
  if (!doc) return { ok: false, error: "not found" };
  return { ok: true, sku: doc.sku, quantity: doc.quantity };
}

async function tool_listCategories() {
  const docs = await Category.find({ isActive: true })
    .select("name slug parentId")
    .lean();
  return {
    categories: docs.map((d) => ({
      name: d.name,
      slug: d.slug,
      parentId: d.parentId ? String(d.parentId) : null,
    })),
  };
}

async function tool_stats() {
  const [total, active, draft, outOfStock, lowStock, pendingCategorize] =
    await Promise.all([
      Product.countDocuments({}),
      Product.countDocuments({ status: "active" }),
      Product.countDocuments({ status: "draft" }),
      Product.countDocuments({ quantity: { $lte: 0 } }),
      Product.countDocuments({ quantity: { $gt: 0, $lt: 10 } }),
      Product.countDocuments({ needsAiCategorize: true }),
    ]);
  return { total, active, draft, outOfStock, lowStock, pendingCategorize };
}

async function tool_sendReviewRequest(args: { firstName: string; phone: string }) {
  const host = process.env.NEXTAUTH_URL || process.env.VERCEL_URL
    ? (process.env.NEXTAUTH_URL || `https://${process.env.VERCEL_URL}`)
    : "http://localhost:3000";
  const cookie = (await (await import("next/headers")).cookies()).get("admin_session");
  const res = await fetch(`${host}/api/admin/reviews/send`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(cookie ? { cookie: `admin_session=${cookie.value}` } : {}),
    },
    body: JSON.stringify({
      firstName: args.firstName,
      phone: args.phone,
      consent: true, // Sparky-initiated sends assume the admin already confirmed
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, error: data.error || `send failed ${res.status}` };
  return { ok: true, ...data };
}

async function tool_categorizePending(args: { limit?: number }) {
  const limit = Math.min(Math.max(args.limit ?? 50, 1), 200);
  // Call the dedicated endpoint via internal fetch so both paths behave identically.
  const host = process.env.NEXTAUTH_URL || process.env.VERCEL_URL
    ? (process.env.NEXTAUTH_URL || `https://${process.env.VERCEL_URL}`)
    : "http://localhost:3000";
  const cookie = (await (await import("next/headers")).cookies()).get("admin_session");
  const res = await fetch(`${host}/api/admin/ai-categorize-pending`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(cookie ? { cookie: `admin_session=${cookie.value}` } : {}),
    },
    body: JSON.stringify({ limit }),
  });
  if (!res.ok) {
    return { error: `categorize endpoint returned ${res.status}`, body: await res.text() };
  }
  return await res.json();
}

async function tool_stageBulkAction(
  args: {
    actionType?: "delete" | "archive";
    query?: string;
    category?: string;
    status?: string;
  },
  admin: { name: string; role: string }
) {
  const { actionType = "delete", query, category, status } = args;

  const mongoQuery: Record<string, unknown> = {};
  if (query) {
    mongoQuery.$or = [
      { name: { $regex: query, $options: "i" } },
      { sku: { $regex: query, $options: "i" } },
    ];
  }
  if (category && category !== "all") {
    mongoQuery.$or = [
      ...((mongoQuery.$or as object[]) || []),
      { category },
      { categories: category },
    ];
  }
  if (status && status !== "all") mongoQuery.status = status;

  const matches = await Product.find(mongoQuery).select("_id").lean();
  if (matches.length === 0) {
    return { ok: false, error: "no matching products", matchCount: 0 };
  }

  const summaryParts: string[] = [];
  if (query) summaryParts.push(`text "${query}"`);
  if (category) summaryParts.push(`category ${category}`);
  if (status) summaryParts.push(`status ${status}`);
  const summary = summaryParts.length ? summaryParts.join(", ") : "all products";

  // Invalidate any other pending actions so only one banner shows at a time.
  await SparkyAction.updateMany(
    { status: "pending" },
    { $set: { status: "rejected", resultMessage: "superseded by newer staging" } }
  );

  const action = await SparkyAction.create({
    actionType,
    filter: { query, category, status },
    productIds: matches.map((m) => m._id),
    matchCount: matches.length,
    summary,
    createdBy: admin.name,
    status: "pending",
  });

  const urlParams = new URLSearchParams();
  if (query) urlParams.set("search", query);
  if (category) urlParams.set("category", category);
  if (status) urlParams.set("status", status);
  urlParams.set("sparkyAction", String(action._id));

  return {
    ok: true,
    actionId: String(action._id),
    actionType,
    matchCount: matches.length,
    summary,
    productsPageUrl: `/admin/products?${urlParams.toString()}`,
    message: `Staged ${matches.length} products for ${actionType}. Admin must approve on the products page.`,
  };
}

type ToolFn = (
  args: Record<string, unknown>,
  admin: { name: string; role: string }
) => Promise<unknown>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const asTool = <T extends (args: any) => Promise<unknown>>(fn: T): ToolFn =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (args) => fn(args as any);

const TOOLS: Record<string, ToolFn> = {
  search_products: asTool(tool_searchProducts),
  update_product: asTool(tool_updateProduct),
  adjust_stock: asTool(tool_adjustStock),
  list_categories: () => tool_listCategories(),
  stats: () => tool_stats(),
  categorize_pending: asTool(tool_categorizePending),
  send_review_request: asTool(tool_sendReviewRequest),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  stage_bulk_action: (args, admin) => tool_stageBulkAction(args as any, admin),
};

// ──────────────────────────────────────────────────────────────────────────────
// Gemini function declarations
// ──────────────────────────────────────────────────────────────────────────────

const FUNCTION_DECLARATIONS = [
  {
    name: "search_products",
    description:
      "Search products by text (name/SKU), category slug, and/or status. Returns `total` (count of all matches in the database) and `products` (up to `limit` sample rows). When `truncated` is true, share `productsPageUrl` with the user so they can view the full filtered list on the admin products page. Always cite `total` (not `returned`) when the user asks 'how many'.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "free-text match against name and SKU" },
        category: { type: "string", description: "category slug, e.g. 'hand-tools'" },
        status: { type: "string", enum: ["active", "draft", "archived", "all"] },
        limit: { type: "integer", minimum: 1, maximum: 200, default: 25 },
      },
    },
  },
  {
    name: "update_product",
    description: "Update a product's fields. Use either `id` (Mongo ObjectId string) OR `sku`. Only include fields you want to change. Use cautiously — these writes are live.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        id: { type: "string" },
        sku: { type: "string" },
        price: { type: "number", minimum: 0 },
        salePrice: { type: "number", minimum: 0 },
        isOnSale: { type: "boolean" },
        quantity: { type: "integer", minimum: 0 },
        status: { type: "string", enum: ["active", "draft", "archived"] },
        category: { type: "string", description: "primary category slug" },
        categories: {
          type: "array",
          items: { type: "string" },
          description: "full array of category slugs",
        },
      },
    },
  },
  {
    name: "adjust_stock",
    description: "Increment or decrement a product's quantity by `delta` (positive to add, negative to remove).",
    parametersJsonSchema: {
      type: "object",
      properties: {
        sku: { type: "string" },
        delta: { type: "integer" },
      },
      required: ["sku", "delta"],
    },
  },
  {
    name: "list_categories",
    description: "List every active category with its slug and parentId, so you can map category names to slugs.",
    parametersJsonSchema: { type: "object", properties: {} },
  },
  {
    name: "stats",
    description: "Get store-wide counts: total products, active, draft, out-of-stock, low-stock, and how many products are waiting on AI categorization.",
    parametersJsonSchema: { type: "object", properties: {} },
  },
  {
    name: "categorize_pending",
    description: "Run AI categorization against products flagged needsAiCategorize=true (new SKUs the importer couldn't map). Processes up to `limit` products per call (1-200, default 50). Safe to call repeatedly until `remaining` reaches 0.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        limit: { type: "integer", minimum: 1, maximum: 200, default: 50 },
      },
    },
  },
  {
    name: "send_review_request",
    description: "Send a Spanish SMS review request (1-5 rating prompt) to a customer who just visited the store. Respect the 30-day anti-spam window. Confirm with the admin before calling this — they're the ones who got verbal consent from the customer.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        firstName: { type: "string" },
        phone: { type: "string", description: "10-digit US/PR phone, any format" },
      },
      required: ["firstName", "phone"],
    },
  },
  {
    name: "stage_bulk_action",
    description:
      "Stage a bulk destructive action (delete or archive) for admin review on the products page. Use whenever the admin asks to delete/archive multiple products — NEVER execute these actions directly. The tool returns a productsPageUrl the admin opens to see a red-highlighted preview with Approve/Cancel buttons. Phrase the response as 'I've staged N products for <action>. Review and approve them on the products page: <link>'. Do not list every SKU in chat — the banner on the page shows them.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        actionType: {
          type: "string",
          enum: ["delete", "archive"],
          description: "delete removes the product; archive sets status to archived (recoverable)",
        },
        query: { type: "string", description: "free-text match against name and SKU" },
        category: { type: "string", description: "category slug" },
        status: { type: "string", enum: ["active", "draft", "archived", "all"] },
      },
      required: ["actionType"],
    },
  },
];

const SYSTEM_INSTRUCTION = `You are Sparky, the MultiElectric Supply admin assistant. You help the store admin inspect and update the catalog.

Guidelines:
- Always confirm with the admin before making a destructive change (bulk price changes, status flips, archive) by summarizing what you're about to do and asking to proceed. For single-field edits where intent is obvious, you can act directly.
- When the admin names a category informally (e.g. "tools", "breakers"), call list_categories first to find the correct slug.
- Prices are USD. Quantity is in units (pieces, rolls, etc).
- When showing product lists, format as concise markdown tables or bullet lists with SKU, name, price, qty.
- If a task would touch more than 20 products at once, stop and ask the admin to confirm the scope explicitly.
- search_products returns \`total\` (real count in DB) and \`products\` (a sample). Always quote \`total\` when the admin asks how many. The admin's browser automatically navigates to the products page when results are truncated — DO NOT paste any URLs or markdown links in your reply. Just say: "Found **136** products matching 'SO'. Showing them on the products page now."
- For bulk destructive asks ("delete all X", "archive all Y"), never execute directly. Always call stage_bulk_action — it records the match list on the server and the admin's browser auto-navigates to the products page where they see a red preview banner. Respond with: "I've staged N products for <action>. Showing them on the products page — review and approve there." DO NOT include a URL or markdown link — navigation is automatic.`;

// ──────────────────────────────────────────────────────────────────────────────
// Route handler
// ──────────────────────────────────────────────────────────────────────────────

type ChatTurn = { role: "user" | "model"; text: string };

export async function POST(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY not configured on the server" },
      { status: 500 }
    );
  }

  let body: { message: string; history?: ChatTurn[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  const userMessage = (body.message || "").trim();
  if (!userMessage) return NextResponse.json({ error: "empty message" }, { status: 400 });

  await connectDB();
  const ai = new GoogleGenAI({ apiKey });

  const contents: Array<{ role: string; parts: Array<Record<string, unknown>> }> = [];
  for (const h of body.history || []) {
    contents.push({ role: h.role, parts: [{ text: h.text }] });
  }
  contents.push({ role: "user", parts: [{ text: userMessage }] });

  const toolCalls: Array<{ name: string; args: unknown; result: unknown }> = [];

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        tools: [{ functionDeclarations: FUNCTION_DECLARATIONS }],
        toolConfig: {
          functionCallingConfig: { mode: FunctionCallingConfigMode.AUTO },
        },
      },
    });

    const candidate = response.candidates?.[0];
    const parts = candidate?.content?.parts || [];
    const fnCalls = parts.filter((p) => p.functionCall);

    if (fnCalls.length === 0) {
      // Model gave a final text answer.
      const text = parts.map((p) => p.text || "").join("") || "(no response)";
      return NextResponse.json({ reply: text, toolCalls });
    }

    // Append the model turn (it issued function calls).
    contents.push({
      role: "model",
      parts: parts as unknown as Array<Record<string, unknown>>,
    });

    // Run each function call locally and return results.
    const responseParts: Array<Record<string, unknown>> = [];
    for (const p of fnCalls) {
      const call = p.functionCall!;
      const impl = TOOLS[call.name as string];
      let result: unknown;
      if (!impl) {
        result = { error: `unknown tool ${call.name}` };
      } else {
        try {
          result = await impl((call.args || {}) as Record<string, unknown>, admin);
        } catch (err) {
          result = { error: err instanceof Error ? err.message : String(err) };
        }
      }
      toolCalls.push({ name: call.name as string, args: call.args, result });
      responseParts.push({
        functionResponse: { name: call.name, response: result as object },
      });
    }
    contents.push({ role: "user", parts: responseParts });
  }

  return NextResponse.json({
    reply:
      "I ran into a loop deciding how to answer that. Try rephrasing, or break the request into smaller steps.",
    toolCalls,
  });
}
