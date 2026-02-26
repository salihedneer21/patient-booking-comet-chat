import type { Doc } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";

export type UserRole = "patient" | "provider" | "admin";

export type UserDoc = Doc<"users">;

export type ViewerIdentity = NonNullable<
  Awaited<ReturnType<QueryCtx["auth"]["getUserIdentity"]>>
>;

export async function getIdentityOrThrow(ctx: {
  auth: { getUserIdentity: () => Promise<ViewerIdentity | null> };
}): Promise<ViewerIdentity> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Unauthorized");
  }
  return identity;
}

export async function getViewerOrThrow(ctx: {
  auth: Pick<QueryCtx["auth"], "getUserIdentity">;
  db: QueryCtx["db"];
}): Promise<{ identity: ViewerIdentity; user: UserDoc }> {
  const identity = await getIdentityOrThrow(ctx);
  const user = await ctx.db
    .query("users")
    .withIndex("by_betterAuthUserId", (q) =>
      q.eq("betterAuthUserId", identity.subject),
    )
    .unique();

  if (!user) {
    throw new Error("User record not found");
  }

  return { identity, user: user as UserDoc };
}

export function requireActiveUser(user: { isActive: boolean }) {
  if (!user.isActive) {
    throw new Error("Account inactive");
  }
}

export function requireRole(user: { role: UserRole }, allowed: readonly UserRole[]) {
  if (!allowed.includes(user.role)) {
    throw new Error("Forbidden");
  }
}

export function isAdmin(user: { role: UserRole }): boolean {
  return user.role === "admin";
}

export function isProviderOrAdmin(user: { role: UserRole }): boolean {
  return user.role === "provider" || user.role === "admin";
}
