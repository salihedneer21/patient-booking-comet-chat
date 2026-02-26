import { v } from "convex/values";
import { query, mutation } from "../../_generated/server";
import { getViewerOrThrow, isAdmin, requireActiveUser, requireRole } from "../../lib/auth";

const availabilityValidator = v.object({
  _id: v.id("providerAvailability"),
  _creationTime: v.number(),
  providerId: v.id("users"),
  dayOfWeek: v.number(),
  startTime: v.string(),
  endTime: v.string(),
  timezone: v.string(),
  isActive: v.boolean(),
  createdAt: v.number(),
  updatedAt: v.number(),
});

// Get provider's availability
export const getMyAvailability = query({
  args: { providerId: v.id("users") },
  returns: v.array(availabilityValidator),
  handler: async (ctx, args) => {
    const { user: viewer } = await getViewerOrThrow(ctx);
    requireActiveUser(viewer);
    requireRole(viewer, ["provider", "admin"]);
    if (!isAdmin(viewer) && viewer._id !== args.providerId) {
      throw new Error("Forbidden");
    }

    return await ctx.db
      .query("providerAvailability")
      .withIndex("by_providerId", (q) => q.eq("providerId", args.providerId))
      .collect();
  },
});

// Get availability for a specific day
export const getByDay = query({
  args: {
    providerId: v.id("users"),
    dayOfWeek: v.number(),
  },
  returns: v.array(availabilityValidator),
  handler: async (ctx, args) => {
    const { user: viewer } = await getViewerOrThrow(ctx);
    requireActiveUser(viewer);
    requireRole(viewer, ["provider", "admin"]);
    if (!isAdmin(viewer) && viewer._id !== args.providerId) {
      throw new Error("Forbidden");
    }

    return await ctx.db
      .query("providerAvailability")
      .withIndex("by_providerId_and_dayOfWeek", (q) =>
        q.eq("providerId", args.providerId).eq("dayOfWeek", args.dayOfWeek)
      )
      .collect();
  },
});

// Set availability for a day (replaces existing)
export const setDayAvailability = mutation({
  args: {
    providerId: v.id("users"),
    dayOfWeek: v.number(),
    slots: v.array(
      v.object({
        startTime: v.string(),
        endTime: v.string(),
      })
    ),
    timezone: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { user: viewer } = await getViewerOrThrow(ctx);
    requireActiveUser(viewer);
    requireRole(viewer, ["provider", "admin"]);
    if (!isAdmin(viewer) && viewer._id !== args.providerId) {
      throw new Error("Forbidden");
    }

    // Delete existing slots for this day
    const existing = await ctx.db
      .query("providerAvailability")
      .withIndex("by_providerId_and_dayOfWeek", (q) =>
        q.eq("providerId", args.providerId).eq("dayOfWeek", args.dayOfWeek)
      )
      .collect();

    for (const slot of existing) {
      await ctx.db.delete(slot._id);
    }

    // Insert new slots
    const now = Date.now();
    for (const slot of args.slots) {
      await ctx.db.insert("providerAvailability", {
        providerId: args.providerId,
        dayOfWeek: args.dayOfWeek,
        startTime: slot.startTime,
        endTime: slot.endTime,
        timezone: args.timezone,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });
    }

    return null;
  },
});

// Add a single time slot
export const addSlot = mutation({
  args: {
    providerId: v.id("users"),
    dayOfWeek: v.number(),
    startTime: v.string(),
    endTime: v.string(),
    timezone: v.string(),
  },
  returns: v.id("providerAvailability"),
  handler: async (ctx, args) => {
    const { user: viewer } = await getViewerOrThrow(ctx);
    requireActiveUser(viewer);
    requireRole(viewer, ["provider", "admin"]);
    if (!isAdmin(viewer) && viewer._id !== args.providerId) {
      throw new Error("Forbidden");
    }

    const now = Date.now();
    return await ctx.db.insert("providerAvailability", {
      providerId: args.providerId,
      dayOfWeek: args.dayOfWeek,
      startTime: args.startTime,
      endTime: args.endTime,
      timezone: args.timezone,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Update a time slot
export const updateSlot = mutation({
  args: {
    slotId: v.id("providerAvailability"),
    startTime: v.optional(v.string()),
    endTime: v.optional(v.string()),
    timezone: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { user: viewer } = await getViewerOrThrow(ctx);
    requireActiveUser(viewer);
    requireRole(viewer, ["provider", "admin"]);

    const slot = await ctx.db.get(args.slotId);
    if (!slot) {
      throw new Error("Availability slot not found");
    }
    if (!isAdmin(viewer) && viewer._id !== slot.providerId) {
      throw new Error("Forbidden");
    }

    const { slotId, ...updates } = args;
    const filteredUpdates: Record<string, unknown> = { updatedAt: Date.now() };

    if (updates.startTime !== undefined) filteredUpdates.startTime = updates.startTime;
    if (updates.endTime !== undefined) filteredUpdates.endTime = updates.endTime;
    if (updates.timezone !== undefined) filteredUpdates.timezone = updates.timezone;
    if (updates.isActive !== undefined) filteredUpdates.isActive = updates.isActive;

    await ctx.db.patch(slotId, filteredUpdates);
    return null;
  },
});

// Delete a time slot
export const deleteSlot = mutation({
  args: { slotId: v.id("providerAvailability") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { user: viewer } = await getViewerOrThrow(ctx);
    requireActiveUser(viewer);
    requireRole(viewer, ["provider", "admin"]);

    const slot = await ctx.db.get(args.slotId);
    if (!slot) {
      throw new Error("Availability slot not found");
    }
    if (!isAdmin(viewer) && viewer._id !== slot.providerId) {
      throw new Error("Forbidden");
    }

    await ctx.db.delete(args.slotId);
    return null;
  },
});

// Toggle day active status
export const toggleDayActive = mutation({
  args: {
    providerId: v.id("users"),
    dayOfWeek: v.number(),
    isActive: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { user: viewer } = await getViewerOrThrow(ctx);
    requireActiveUser(viewer);
    requireRole(viewer, ["provider", "admin"]);
    if (!isAdmin(viewer) && viewer._id !== args.providerId) {
      throw new Error("Forbidden");
    }

    const slots = await ctx.db
      .query("providerAvailability")
      .withIndex("by_providerId_and_dayOfWeek", (q) =>
        q.eq("providerId", args.providerId).eq("dayOfWeek", args.dayOfWeek)
      )
      .collect();

    const now = Date.now();
    for (const slot of slots) {
      await ctx.db.patch(slot._id, {
        isActive: args.isActive,
        updatedAt: now,
      });
    }

    return null;
  },
});

// Get provider availability for booking (public query for patients)
export const getProviderAvailability = query({
  args: { providerId: v.id("users") },
  returns: v.array(availabilityValidator),
  handler: async (ctx, args) => {
    const { user: viewer } = await getViewerOrThrow(ctx);
    requireActiveUser(viewer);

    // Only return active slots
    const allSlots = await ctx.db
      .query("providerAvailability")
      .withIndex("by_providerId", (q) => q.eq("providerId", args.providerId))
      .collect();

    return allSlots.filter((slot) => slot.isActive);
  },
});

// Bulk set weekly availability
export const setWeeklyAvailability = mutation({
  args: {
    providerId: v.id("users"),
    timezone: v.string(),
    weeklySlots: v.array(
      v.object({
        dayOfWeek: v.number(),
        slots: v.array(
          v.object({
            startTime: v.string(),
            endTime: v.string(),
          })
        ),
      })
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { user: viewer } = await getViewerOrThrow(ctx);
    requireActiveUser(viewer);
    requireRole(viewer, ["provider", "admin"]);
    if (!isAdmin(viewer) && viewer._id !== args.providerId) {
      throw new Error("Forbidden");
    }

    // Delete all existing slots for this provider
    const existing = await ctx.db
      .query("providerAvailability")
      .withIndex("by_providerId", (q) => q.eq("providerId", args.providerId))
      .collect();

    for (const slot of existing) {
      await ctx.db.delete(slot._id);
    }

    // Insert new slots
    const now = Date.now();
    for (const day of args.weeklySlots) {
      for (const slot of day.slots) {
        await ctx.db.insert("providerAvailability", {
          providerId: args.providerId,
          dayOfWeek: day.dayOfWeek,
          startTime: slot.startTime,
          endTime: slot.endTime,
          timezone: args.timezone,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    return null;
  },
});
