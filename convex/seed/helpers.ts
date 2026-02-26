import { internalMutation, internalQuery } from "../_generated/server";
import { v } from "convex/values";
import { components } from "../_generated/api";

// Helper: Check if admin exists in our users table
export const checkAdminExists = internalQuery({
  args: { email: v.string() },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();
    return user !== null;
  },
});

// Helper: Get Better Auth user by email (query the component's user table)
export const getBetterAuthUser = internalQuery({
  args: { email: v.string() },
  returns: v.union(v.object({ _id: v.string() }), v.null()),
  handler: async (ctx, args) => {
    // Query the Better Auth user table via the adapter
    const result = await ctx.runQuery(components.betterAuth.adapter.findOne, {
      model: "user",
      where: [{ field: "email", value: args.email, operator: "eq" }],
      select: ["_id"],
    });
    return result ? { _id: result._id as string } : null;
  },
});

// Helper: Create admin user in our users table
export const createAdminInUsersTable = internalMutation({
  args: {
    betterAuthUserId: v.string(),
    email: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.insert("users", {
      betterAuthUserId: args.betterAuthUserId,
      email: args.email,
      name: "Admin",
      role: "admin",
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
    return null;
  },
});
