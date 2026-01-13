import connectDB from "@/lib/mongodb";
import ActivityLog from "@/models/ActivityLog";

interface LogActivityParams {
  action: string;
  category: "order" | "product" | "client" | "user" | "settings" | "system";
  description: string;
  userId?: string;
  userName: string;
  userRole: string;
  targetId?: string;
  targetType?: string;
  targetName?: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
}

export async function logActivity(params: LogActivityParams) {
  try {
    await connectDB();
    
    await ActivityLog.create({
      action: params.action,
      category: params.category,
      description: params.description,
      userId: params.userId,
      userName: params.userName,
      userRole: params.userRole,
      targetId: params.targetId,
      targetType: params.targetType,
      targetName: params.targetName,
      metadata: params.metadata,
      ipAddress: params.ipAddress,
    });
    
    console.log(`Activity logged: ${params.action} - ${params.description}`);
  } catch (error) {
    console.error("Failed to log activity:", error);
    // Don't throw - activity logging should not break main operations
  }
}

// Convenience functions for common actions
export async function logOrderAction(
  action: string,
  orderNumber: string,
  orderId: string,
  userName: string,
  userRole: string,
  description?: string,
  metadata?: Record<string, any>
) {
  return logActivity({
    action,
    category: "order",
    description: description || `Order ${orderNumber} ${action}`,
    userName,
    userRole,
    targetId: orderId,
    targetType: "Order",
    targetName: orderNumber,
    metadata,
  });
}

export async function logProductAction(
  action: string,
  productName: string,
  productId: string,
  userName: string,
  userRole: string,
  description?: string,
  metadata?: Record<string, any>
) {
  return logActivity({
    action,
    category: "product",
    description: description || `Product "${productName}" ${action}`,
    userName,
    userRole,
    targetId: productId,
    targetType: "Product",
    targetName: productName,
    metadata,
  });
}

export async function logUserAction(
  action: string,
  targetUserName: string,
  targetUserId: string,
  userName: string,
  userRole: string,
  description?: string,
  metadata?: Record<string, any>
) {
  return logActivity({
    action,
    category: "user",
    description: description || `User "${targetUserName}" ${action}`,
    userName,
    userRole,
    targetId: targetUserId,
    targetType: "User",
    targetName: targetUserName,
    metadata,
  });
}

