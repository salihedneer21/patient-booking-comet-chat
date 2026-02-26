import { v } from "convex/values";
import { query, mutation } from "../../_generated/server";
import { userRoleValidator } from "../../schema";
import { getViewerOrThrow, requireActiveUser, requireRole } from "../../lib/auth";

async function requireAdmin(ctx: Parameters<typeof getViewerOrThrow>[0]) {
  const { user } = await getViewerOrThrow(ctx);
  requireActiveUser(user);
  requireRole(user, ["admin"]);
  return user;
}

// User validator
const userValidator = v.object({
  _id: v.id("users"),
  _creationTime: v.number(),
  betterAuthUserId: v.string(),
  email: v.string(),
  name: v.optional(v.string()),
  role: userRoleValidator,
  isActive: v.boolean(),
  createdAt: v.number(),
  updatedAt: v.number(),
});

// === PLATFORM STATISTICS ===

export const getPlatformStats = query({
  args: {},
  returns: v.object({
    totalPatients: v.number(),
    totalProviders: v.number(),
    totalAdmins: v.number(),
    appointmentsToday: v.number(),
    newRegistrationsThisWeek: v.number(),
  }),
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const patients = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "patient"))
      .collect();

    const providers = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "provider"))
      .collect();

    const admins = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "admin"))
      .collect();

    // Get today's appointments
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const todayEnd = todayStart + 24 * 60 * 60 * 1000;

    const todayAppointments = await ctx.db
      .query("appointments")
      .withIndex("by_scheduledAt")
      .collect();

    const appointmentsToday = todayAppointments.filter(
      (apt) => apt.scheduledAt >= todayStart && apt.scheduledAt < todayEnd
    ).length;

    // Get new registrations this week
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const newRegistrations = patients.filter((p) => p.createdAt >= weekAgo).length;

    return {
      totalPatients: patients.length,
      totalProviders: providers.length,
      totalAdmins: admins.length,
      appointmentsToday,
      newRegistrationsThisWeek: newRegistrations,
    };
  },
});

// === PATIENT MANAGEMENT ===

export const listAllPatients = query({
  args: {
    includeInactive: v.optional(v.boolean()),
  },
  returns: v.array(
    v.object({
      user: userValidator,
      intake: v.union(
        v.object({
          _id: v.id("patientIntake"),
          firstName: v.string(),
          lastName: v.string(),
          intakeCompleted: v.boolean(),
        }),
        v.null()
      ),
    })
  ),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const patients = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "patient"))
      .collect();

    const filtered = args.includeInactive
      ? patients
      : patients.filter((p) => p.isActive);

    const results = [];
    for (const user of filtered) {
      const intake = await ctx.db
        .query("patientIntake")
        .withIndex("by_userId", (q) => q.eq("userId", user._id))
        .unique();

      results.push({
        user,
        intake: intake
          ? {
              _id: intake._id,
              firstName: intake.firstName,
              lastName: intake.lastName,
              intakeCompleted: intake.intakeCompleted,
            }
          : null,
      });
    }

    return results;
  },
});

export const getRecentPatients = query({
  args: { limit: v.optional(v.number()) },
  returns: v.array(userValidator),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const patients = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "patient"))
      .order("desc")
      .take(args.limit || 5);

    return patients;
  },
});

export const createPatient = mutation({
  args: {
    betterAuthUserId: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
  },
  returns: v.id("users"),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const now = Date.now();
    return await ctx.db.insert("users", {
      betterAuthUserId: args.betterAuthUserId,
      email: args.email,
      name: args.name,
      role: "patient",
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const togglePatientStatus = mutation({
  args: { userId: v.id("users") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");
    if (user.role !== "patient") throw new Error("User is not a patient");

    await ctx.db.patch(args.userId, {
      isActive: !user.isActive,
      updatedAt: Date.now(),
    });
    return null;
  },
});

// === PROVIDER MANAGEMENT ===

export const listAllProviders = query({
  args: {
    includeInactive: v.optional(v.boolean()),
  },
  returns: v.array(
    v.object({
      user: userValidator,
      profile: v.union(
        v.object({
          _id: v.id("providerProfiles"),
          firstName: v.string(),
          lastName: v.string(),
          email: v.string(),
        }),
        v.null()
      ),
    })
  ),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const providers = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "provider"))
      .collect();

    const filtered = args.includeInactive
      ? providers
      : providers.filter((p) => p.isActive);

    const results = [];
    for (const user of filtered) {
      const profile = await ctx.db
        .query("providerProfiles")
        .withIndex("by_userId", (q) => q.eq("userId", user._id))
        .unique();

      results.push({
        user,
        profile: profile
          ? {
              _id: profile._id,
              firstName: profile.firstName,
              lastName: profile.lastName,
              email: profile.email,
            }
          : null,
      });
    }

    return results;
  },
});

export const getRecentProviders = query({
  args: { limit: v.optional(v.number()) },
  returns: v.array(userValidator),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const providers = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "provider"))
      .order("desc")
      .take(args.limit || 5);

    return providers;
  },
});

export const createProvider = mutation({
  args: {
    betterAuthUserId: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
  },
  returns: v.object({
    userId: v.id("users"),
    profileId: v.id("providerProfiles"),
  }),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const now = Date.now();

    // Create user
    const userId = await ctx.db.insert("users", {
      betterAuthUserId: args.betterAuthUserId,
      email: args.email,
      name: args.name,
      role: "provider",
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    // Create provider profile
    const profileId = await ctx.db.insert("providerProfiles", {
      userId,
      firstName: args.firstName || "",
      lastName: args.lastName || "",
      email: args.email,
      createdAt: now,
      updatedAt: now,
    });

    return { userId, profileId };
  },
});

export const toggleProviderStatus = mutation({
  args: { userId: v.id("users") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");
    if (user.role !== "provider") throw new Error("User is not a provider");

    await ctx.db.patch(args.userId, {
      isActive: !user.isActive,
      updatedAt: Date.now(),
    });
    return null;
  },
});

// === USER MANAGEMENT (GENERAL) ===

export const updateUserRole = mutation({
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

export const deleteUser = mutation({
  args: { userId: v.id("users") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    // Note: In production, consider soft delete or cascade delete related records
    await ctx.db.delete(args.userId);
    return null;
  },
});

// Get user by ID with role-specific profile
export const getUserById = query({
  args: { userId: v.id("users") },
  returns: v.union(
    v.object({
      user: userValidator,
      intake: v.any(),
      profile: v.any(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const user = await ctx.db.get(args.userId);
    if (!user) return null;

    let intake = null;
    let profile = null;

    if (user.role === "patient") {
      intake = await ctx.db
        .query("patientIntake")
        .withIndex("by_userId", (q) => q.eq("userId", user._id))
        .unique();
    } else if (user.role === "provider" || user.role === "admin") {
      profile = await ctx.db
        .query("providerProfiles")
        .withIndex("by_userId", (q) => q.eq("userId", user._id))
        .unique();
    }

    return { user, intake, profile };
  },
});
