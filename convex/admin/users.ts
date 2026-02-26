import { v } from "convex/values";
import { query, mutation } from "../_generated/server";
import { userRoleValidator } from "../schema";
import { getViewerOrThrow, requireActiveUser, requireRole } from "../lib/auth";

async function requireAdmin(ctx: Parameters<typeof getViewerOrThrow>[0]) {
  const { user } = await getViewerOrThrow(ctx);
  requireActiveUser(user);
  requireRole(user, ["admin"]);
  return user;
}

// List all users (admin only)
export const listAll = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("users"),
      _creationTime: v.number(),
      betterAuthUserId: v.string(),
      email: v.string(),
      name: v.optional(v.string()),
      role: userRoleValidator,
      isActive: v.boolean(),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
  ),
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.db.query("users").collect();
  },
});

// List users by role (admin only)
export const listByRole = query({
  args: { role: userRoleValidator },
  returns: v.array(
    v.object({
      _id: v.id("users"),
      _creationTime: v.number(),
      betterAuthUserId: v.string(),
      email: v.string(),
      name: v.optional(v.string()),
      role: userRoleValidator,
      isActive: v.boolean(),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", args.role))
      .collect();
  },
});

// Update user role (admin only)
export const updateRole = mutation({
  args: {
    userId: v.id("users"),
    role: userRoleValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.patch(args.userId, {
      role: args.role,
      updatedAt: Date.now(),
    });
    return null;
  },
});

// Toggle user active status (admin only)
export const toggleActive = mutation({
  args: { userId: v.id("users") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }
    await ctx.db.patch(args.userId, {
      isActive: !user.isActive,
      updatedAt: Date.now(),
    });
    return null;
  },
});

// Delete user (admin only)
export const deleteUser = mutation({
  args: { userId: v.id("users") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.delete(args.userId);
    return null;
  },
});
