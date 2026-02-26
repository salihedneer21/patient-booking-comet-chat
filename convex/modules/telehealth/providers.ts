import { v } from "convex/values";
import { query, mutation } from "../../_generated/server";
import { getViewerOrThrow, isAdmin, requireActiveUser, requireRole } from "../../lib/auth";

const licenseNumberValidator = v.object({
  number: v.string(),
  state: v.string(),
});

const providerProfileValidator = v.object({
  _id: v.id("providerProfiles"),
  _creationTime: v.number(),
  userId: v.id("users"),
  firstName: v.string(),
  lastName: v.string(),
  email: v.string(),
  phone: v.optional(v.string()),
  avatarStorageId: v.optional(v.id("_storage")),
  licenseNumbers: v.optional(v.array(licenseNumberValidator)),
  boardCertifications: v.optional(v.array(v.string())),
  education: v.optional(v.array(v.string())),
  languagesSpoken: v.optional(v.array(v.string())),
  professionalAssociations: v.optional(v.array(v.string())),
  yearsOfExperience: v.optional(v.number()),
  bio: v.optional(v.string()),
  practiceStreet: v.optional(v.string()),
  practiceCity: v.optional(v.string()),
  practiceState: v.optional(v.string()),
  practiceZip: v.optional(v.string()),
  servicesOffered: v.optional(v.array(v.string())),
  insurancePlansAccepted: v.optional(v.array(v.string())),
  hospitalAffiliations: v.optional(v.array(v.string())),
  cometChatUid: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
});

// Get current provider's profile
export const getMyProfile = query({
  args: { userId: v.id("users") },
  returns: v.union(providerProfileValidator, v.null()),
  handler: async (ctx, args) => {
    const { user: viewer } = await getViewerOrThrow(ctx);
    requireActiveUser(viewer);
    requireRole(viewer, ["provider", "admin"]);

    if (!isAdmin(viewer) && viewer._id !== args.userId) {
      throw new Error("Forbidden");
    }

    return await ctx.db
      .query("providerProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique();
  },
});

// Create or get provider profile
export const getOrCreateProfile = mutation({
  args: {
    userId: v.id("users"),
    email: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
  },
  returns: v.id("providerProfiles"),
  handler: async (ctx, args) => {
    const { user: viewer } = await getViewerOrThrow(ctx);
    requireActiveUser(viewer);
    requireRole(viewer, ["provider", "admin"]);

    if (!isAdmin(viewer) && viewer._id !== args.userId) {
      throw new Error("Forbidden");
    }

    const existing = await ctx.db
      .query("providerProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique();

    if (existing) {
      return existing._id;
    }

    const now = Date.now();
    return await ctx.db.insert("providerProfiles", {
      userId: args.userId,
      firstName: args.firstName || "",
      lastName: args.lastName || "",
      email: args.email,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Update provider profile - basic info
export const updateBasicInfo = mutation({
  args: {
    profileId: v.id("providerProfiles"),
    firstName: v.string(),
    lastName: v.string(),
    phone: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { user: viewer } = await getViewerOrThrow(ctx);
    requireActiveUser(viewer);
    requireRole(viewer, ["provider", "admin"]);

    const profile = await ctx.db.get(args.profileId);
    if (!profile) throw new Error("Provider profile not found");
    if (!isAdmin(viewer) && profile.userId !== viewer._id) {
      throw new Error("Forbidden");
    }

    const { profileId, ...data } = args;
    await ctx.db.patch(profileId, {
      ...data,
      updatedAt: Date.now(),
    });
    return null;
  },
});

// Update provider profile - professional info
export const updateProfessionalInfo = mutation({
  args: {
    profileId: v.id("providerProfiles"),
    licenseNumbers: v.optional(v.array(licenseNumberValidator)),
    boardCertifications: v.optional(v.array(v.string())),
    education: v.optional(v.array(v.string())),
    languagesSpoken: v.optional(v.array(v.string())),
    professionalAssociations: v.optional(v.array(v.string())),
    yearsOfExperience: v.optional(v.number()),
    bio: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { user: viewer } = await getViewerOrThrow(ctx);
    requireActiveUser(viewer);
    requireRole(viewer, ["provider", "admin"]);

    const profile = await ctx.db.get(args.profileId);
    if (!profile) throw new Error("Provider profile not found");
    if (!isAdmin(viewer) && profile.userId !== viewer._id) {
      throw new Error("Forbidden");
    }

    const { profileId, ...data } = args;
    await ctx.db.patch(profileId, {
      ...data,
      updatedAt: Date.now(),
    });
    return null;
  },
});

// Update provider profile - practice details
export const updatePracticeDetails = mutation({
  args: {
    profileId: v.id("providerProfiles"),
    practiceStreet: v.optional(v.string()),
    practiceCity: v.optional(v.string()),
    practiceState: v.optional(v.string()),
    practiceZip: v.optional(v.string()),
    servicesOffered: v.optional(v.array(v.string())),
    insurancePlansAccepted: v.optional(v.array(v.string())),
    hospitalAffiliations: v.optional(v.array(v.string())),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { user: viewer } = await getViewerOrThrow(ctx);
    requireActiveUser(viewer);
    requireRole(viewer, ["provider", "admin"]);

    const profile = await ctx.db.get(args.profileId);
    if (!profile) throw new Error("Provider profile not found");
    if (!isAdmin(viewer) && profile.userId !== viewer._id) {
      throw new Error("Forbidden");
    }

    const { profileId, ...data } = args;
    await ctx.db.patch(profileId, {
      ...data,
      updatedAt: Date.now(),
    });
    return null;
  },
});

// Update avatar
export const updateAvatar = mutation({
  args: {
    profileId: v.id("providerProfiles"),
    avatarStorageId: v.id("_storage"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { user: viewer } = await getViewerOrThrow(ctx);
    requireActiveUser(viewer);
    requireRole(viewer, ["provider", "admin"]);

    const profile = await ctx.db.get(args.profileId);
    if (!profile) throw new Error("Provider profile not found");
    if (!isAdmin(viewer) && profile.userId !== viewer._id) {
      throw new Error("Forbidden");
    }

    await ctx.db.patch(args.profileId, {
      avatarStorageId: args.avatarStorageId,
      updatedAt: Date.now(),
    });
    return null;
  },
});

// Remove avatar
export const removeAvatar = mutation({
  args: { profileId: v.id("providerProfiles") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { user: viewer } = await getViewerOrThrow(ctx);
    requireActiveUser(viewer);
    requireRole(viewer, ["provider", "admin"]);

    const profile = await ctx.db.get(args.profileId);
    if (!profile) throw new Error("Provider profile not found");
    if (!isAdmin(viewer) && profile.userId !== viewer._id) {
      throw new Error("Forbidden");
    }

    await ctx.db.patch(args.profileId, {
      avatarStorageId: undefined,
      updatedAt: Date.now(),
    });
    return null;
  },
});

// List all providers (for patient booking)
export const listAll = query({
  args: {},
  returns: v.array(providerProfileValidator),
  handler: async (ctx) => {
    const { user: viewer } = await getViewerOrThrow(ctx);
    requireActiveUser(viewer);
    return await ctx.db.query("providerProfiles").collect();
  },
});

// List active providers (alias for patient interfaces)
export const listActive = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("providerProfiles"),
      userId: v.id("users"),
      firstName: v.string(),
      lastName: v.string(),
      profileImageUrl: v.optional(v.string()),
      specialty: v.optional(v.string()),
      bio: v.optional(v.string()),
    })
  ),
  handler: async (ctx) => {
    const { user: viewer } = await getViewerOrThrow(ctx);
    requireActiveUser(viewer);

    const profiles = await ctx.db.query("providerProfiles").collect();
    return profiles.map((p) => ({
      _id: p._id,
      userId: p.userId,
      firstName: p.firstName,
      lastName: p.lastName,
      profileImageUrl: p.avatarStorageId
        ? undefined // Would need to get URL from storage
        : undefined,
      specialty: p.servicesOffered?.[0] || undefined, // Use first service as "specialty"
      bio: p.bio,
    }));
  },
});

// Get provider by ID
export const getById = query({
  args: { profileId: v.id("providerProfiles") },
  returns: v.union(providerProfileValidator, v.null()),
  handler: async (ctx, args) => {
    const { user: viewer } = await getViewerOrThrow(ctx);
    requireActiveUser(viewer);
    return await ctx.db.get(args.profileId);
  },
});

// Get provider by user ID
export const getByUserId = query({
  args: { userId: v.id("users") },
  returns: v.union(providerProfileValidator, v.null()),
  handler: async (ctx, args) => {
    const { user: viewer } = await getViewerOrThrow(ctx);
    requireActiveUser(viewer);
    return await ctx.db
      .query("providerProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique();
  },
});

// Generate upload URL for avatar
export const generateUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    const { user: viewer } = await getViewerOrThrow(ctx);
    requireActiveUser(viewer);
    requireRole(viewer, ["provider", "admin"]);

    return await ctx.storage.generateUploadUrl();
  },
});
