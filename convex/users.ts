import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { userRoleValidator } from "./schema";
import { getIdentityOrThrow, getViewerOrThrow, requireActiveUser } from "./lib/auth";

// Get current user by Better Auth user ID
export const getCurrentUser = query({
  args: { betterAuthUserId: v.string() },
  returns: v.union(
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
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const identity = await getIdentityOrThrow(ctx);
    if (identity.subject !== args.betterAuthUserId) {
      throw new Error("Unauthorized");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_betterAuthUserId", (q) =>
        q.eq("betterAuthUserId", args.betterAuthUserId)
      )
      .unique();
    return user;
  },
});

// Get user by ID
export const getById = query({
  args: { userId: v.id("users") },
  returns: v.union(
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
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const { user } = await getViewerOrThrow(ctx);
    requireActiveUser(user);

    if (user.role !== "admin" && user._id !== args.userId) {
      throw new Error("Forbidden");
    }

    return await ctx.db.get(args.userId);
  },
});

// Get or create user - new users are always patients (admin is pre-seeded)
export const getOrCreateUser = mutation({
  args: {
    betterAuthUserId: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
  },
  returns: v.object({
    _id: v.id("users"),
    _creationTime: v.number(),
    betterAuthUserId: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
    role: userRoleValidator,
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }),
  handler: async (ctx, args) => {
    const identity = await getIdentityOrThrow(ctx);
    if (identity.subject !== args.betterAuthUserId) {
      throw new Error("Unauthorized");
    }
    if (identity.email && identity.email !== args.email) {
      throw new Error("Unauthorized");
    }

    // Check if user already exists (admin is pre-seeded, will be found here)
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_betterAuthUserId", (q) =>
        q.eq("betterAuthUserId", args.betterAuthUserId)
      )
      .unique();

    if (existingUser) {
      return existingUser;
    }

    // New users are always patients
    const now = Date.now();
    const userId = await ctx.db.insert("users", {
      betterAuthUserId: args.betterAuthUserId,
      email: args.email,
      name: args.name,
      role: "patient",
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    const newUser = await ctx.db.get(userId);
    return newUser!;
  },
});

// Update user profile
export const updateProfile = mutation({
  args: {
    userId: v.id("users"),
    name: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { user } = await getViewerOrThrow(ctx);
    requireActiveUser(user);

    if (user.role !== "admin" && user._id !== args.userId) {
      throw new Error("Forbidden");
    }

    const updates: { name?: string; updatedAt: number } = {
      updatedAt: Date.now(),
    };
    if (args.name !== undefined) {
      updates.name = args.name;
    }
    await ctx.db.patch(args.userId, updates);
    return null;
  },
});
