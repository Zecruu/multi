import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Client from "@/models/Client";
import User from "@/models/User";
import Order from "@/models/Order";

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status");
    const source = searchParams.get("source") || "all"; // "all", "registered", "orders"

    const skip = (page - 1) * limit;

    // Build search query for users
    const userQuery: Record<string, unknown> = { role: "customer" };
    if (search) {
      userQuery.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }
    if (status && status !== "all") {
      userQuery.isActive = status === "active";
    }

    // Build search query for clients (from orders)
    const clientQuery: Record<string, unknown> = {};
    if (search) {
      clientQuery.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { company: { $regex: search, $options: "i" } },
      ];
    }
    if (status && status !== "all") {
      clientQuery.status = status;
    }

    // Fetch registered customers (Users with role "customer")
    const registeredUsers = source !== "orders" ? await User.find(userQuery)
      .select("name email phone isActive createdAt")
      .sort({ createdAt: -1 })
      .lean() : [];

    // Fetch CRM clients (from orders)
    const orderClients = source !== "registered" ? await Client.find(clientQuery)
      .sort({ createdAt: -1 })
      .lean() : [];

    // Get order stats for registered users
    const userEmails = registeredUsers.map(u => u.email);
    const userOrderStats = await Order.aggregate([
      { $match: { "customer.email": { $in: userEmails }, paymentStatus: "paid" } },
      { $group: { _id: "$customer.email", totalOrders: { $sum: 1 }, totalSpent: { $sum: "$total" } } }
    ]);
    const statsMap = new Map(userOrderStats.map(s => [s._id, s]));

    // Define client type
    interface TransformedClient {
      _id: unknown;
      name: string;
      email: string;
      phone: string;
      company: string;
      status: string;
      totalOrders: number;
      totalSpent: number;
      createdAt: Date;
      source: "registered" | "orders";
    }

    // Transform registered users to client format
    const transformedUsers: TransformedClient[] = registeredUsers.map(user => ({
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone || "",
      company: "",
      status: user.isActive ? "active" : "inactive",
      totalOrders: statsMap.get(user.email)?.totalOrders || 0,
      totalSpent: statsMap.get(user.email)?.totalSpent || 0,
      createdAt: user.createdAt,
      source: "registered" as const,
    }));

    // Transform order clients, mark their source
    const transformedClients: TransformedClient[] = orderClients.map(client => ({
      _id: client._id,
      name: client.name,
      email: client.email,
      phone: client.phone || "",
      company: client.company || "",
      status: client.status || "active",
      totalOrders: client.totalOrders || 0,
      totalSpent: client.totalSpent || 0,
      createdAt: client.createdAt,
      source: "orders" as const,
    }));

    // Combine and deduplicate by email (prefer registered users)
    const emailSet = new Set<string>();
    const allClients: TransformedClient[] = [];

    // Add registered users first
    for (const user of transformedUsers) {
      if (!emailSet.has(user.email)) {
        emailSet.add(user.email);
        allClients.push(user);
      }
    }

    // Add order clients that aren't already registered
    for (const client of transformedClients) {
      if (!emailSet.has(client.email)) {
        emailSet.add(client.email);
        allClients.push(client);
      }
    }

    // Sort by createdAt descending
    allClients.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Paginate
    const total = allClients.length;
    const paginatedClients = allClients.slice(skip, skip + limit);

    return NextResponse.json({
      clients: paginatedClients,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching clients:", error);
    return NextResponse.json(
      { error: "Failed to fetch clients" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();

    // Check if email already exists
    const existingClient = await Client.findOne({ email: body.email });
    if (existingClient) {
      return NextResponse.json(
        { error: "A client with this email already exists" },
        { status: 400 }
      );
    }

    const client = await Client.create(body);

    return NextResponse.json(client, { status: 201 });
  } catch (error) {
    console.error("Error creating client:", error);
    return NextResponse.json(
      { error: "Failed to create client" },
      { status: 500 }
    );
  }
}
