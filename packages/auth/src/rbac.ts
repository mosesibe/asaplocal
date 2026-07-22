/**
 * Central RBAC matrix for AsapLocal.
 *
 * Role hierarchy (not a strict total order — DISPATCHER and PROVIDER are
 * siblings, but DISPATCHER sits above CUSTOMER and below ADMIN in terms of
 * platform-operational permissions):
 *
 *   ADMIN > DISPATCHER > PROVIDER / CUSTOMER
 *
 * Dispatchers can read/track all job requests and *propose* mutations
 * (assign to provider, edit, delete, status override) but every mutation
 * they make is written as a pending ApprovalRequest — it only takes effect
 * once an Admin approves it. Dispatchers never get raw CRUD.
 */
export type Role = "CUSTOMER" | "PROVIDER" | "DISPATCHER" | "ADMIN";

export const ROLE_RANK: Record<Role, number> = {
  CUSTOMER: 0,
  PROVIDER: 0,
  DISPATCHER: 1,
  ADMIN: 2,
};

export type Permission =
  | "job.read.any"
  | "job.propose_assign"
  | "job.propose_update"
  | "job.propose_delete"
  | "job.approve_changes"
  | "job.crud.direct"
  | "lead.purchase"
  | "lead.claim"
  | "lead.refund.request"
  | "lead.refund.approve"
  | "business.verify"
  | "user.suspend"
  | "review.moderate"
  | "subscription.manage_own"
  | "subscription.manage_any"
  | "platform.analytics.view"
  | "category.manage"
  | "report.resolve"
  | "audit.view";

const PERMISSIONS: Record<Role, Permission[]> = {
  CUSTOMER: ["lead.refund.request"], // customers can flag a lead/job as problematic indirectly via reports
  PROVIDER: ["lead.purchase", "lead.claim", "lead.refund.request", "subscription.manage_own"],
  DISPATCHER: ["job.read.any", "job.propose_assign", "job.propose_update", "job.propose_delete"],
  ADMIN: [
    "job.read.any",
    "job.propose_assign",
    "job.propose_update",
    "job.propose_delete",
    "job.approve_changes",
    "job.crud.direct",
    "lead.purchase",
    "lead.claim",
    "lead.refund.request",
    "lead.refund.approve",
    "business.verify",
    "user.suspend",
    "review.moderate",
    "subscription.manage_own",
    "subscription.manage_any",
    "platform.analytics.view",
    "category.manage",
    "report.resolve",
    "audit.view",
  ],
};

export function can(role: Role, permission: Permission): boolean {
  return PERMISSIONS[role]?.includes(permission) ?? false;
}

export function requireRole(role: Role | undefined, allowed: Role[]): asserts role is Role {
  if (!role || !allowed.includes(role)) {
    const err = new Error(`Forbidden: role "${role ?? "none"}" not in [${allowed.join(", ")}]`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (err as any).statusCode = 403;
    throw err;
  }
}

export function requirePermission(role: Role | undefined, permission: Permission): void {
  if (!role || !can(role, permission)) {
    const err = new Error(`Forbidden: role "${role ?? "none"}" lacks permission "${permission}"`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (err as any).statusCode = 403;
    throw err;
  }
}

/** Dispatcher mutations to JobRequest always go through this — never direct writes. */
export function dispatcherActionRequiresApproval(role: Role): boolean {
  return role === "DISPATCHER";
}
