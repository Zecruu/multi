export const ADMIN_PANEL_ROLES = [
  "admin",
  "manager",
  "staff",
  "gerente",
  "employee",
] as const;

export function hasAdminPanelAccess(role: unknown): boolean {
  return (
    typeof role === "string" &&
    (ADMIN_PANEL_ROLES as readonly string[]).includes(role)
  );
}
