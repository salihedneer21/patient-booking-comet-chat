import { v } from "convex/values";
import { query, mutation } from "../../_generated/server";
import {
  getViewerOrThrow,
  isAdmin,
  requireActiveUser,
  requireRole,
} from "../../lib/auth";

const appointmentStatusValidator = v.union(
  v.literal("upcoming"),
  v.literal("unconfirmed"),
  v.literal("completed"),
  v.literal("canceled"),
  v.literal("rescheduled")
);

const appointmentValidator = v.object({
  _id: v.id("appointments"),
  _creationTime: v.number(),
  patientId: v.id("users"),
  providerId: v.id("users"),
  scheduledAt: v.number(),
  durationMinutes: v.number(),
  timezone: v.string(),
  status: appointmentStatusValidator,
  reasonForVisit: v.string(),
  cometChatSessionId: v.string(),
  sessionLink: v.string(),
  patientJoinedAt: v.optional(v.number()),
  providerJoinedAt: v.optional(v.number()),
  endedAt: v.optional(v.number()),
  canceledBy: v.optional(v.id("users")),
  cancelReason: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
});

// Create appointment
export const create = mutation({
  args: {
    patientId: v.id("users"),
    providerId: v.id("users"),
    scheduledAt: v.number(),
    durationMinutes: v.optional(v.number()),
    timezone: v.string(),
    reasonForVisit: v.string(),
  },
  returns: v.id("appointments"),
  handler: async (ctx, args) => {
    const { user: viewer } = await getViewerOrThrow(ctx);
    requireActiveUser(viewer);
    requireRole(viewer, ["patient", "provider", "admin"]);

    if (viewer.role === "patient" && args.patientId !== viewer._id) {
      throw new Error("Forbidden");
    }
    if (viewer.role === "provider" && args.providerId !== viewer._id) {
      throw new Error("Forbidden");
    }

    const patient = await ctx.db.get(args.patientId);
    if (!patient || patient.role !== "patient") {
      throw new Error("Patient not found");
    }
    const provider = await ctx.db.get(args.providerId);
    if (!provider || (provider.role !== "provider" && provider.role !== "admin")) {
      throw new Error("Provider not found");
    }

    const now = Date.now();
    if (args.scheduledAt < now - 60_000) {
      throw new Error("Scheduled time must be in the future");
    }

    // Generate unique session ID for CometChat call
    const cometChatSessionId = crypto.randomUUID();
    const sessionLink = `/call/${cometChatSessionId}`;

    const status = viewer.role === "patient" ? "unconfirmed" : "upcoming";

    const appointmentId = await ctx.db.insert("appointments", {
      patientId: args.patientId,
      providerId: args.providerId,
      scheduledAt: args.scheduledAt,
      durationMinutes: args.durationMinutes || 30,
      timezone: args.timezone,
      status,
      reasonForVisit: args.reasonForVisit,
      cometChatSessionId,
      sessionLink,
      createdAt: now,
      updatedAt: now,
    });

    return appointmentId;
  },
});

// Get appointment by ID
export const getById = query({
  args: { appointmentId: v.id("appointments") },
  returns: v.union(appointmentValidator, v.null()),
  handler: async (ctx, args) => {
    const { user: viewer } = await getViewerOrThrow(ctx);
    requireActiveUser(viewer);

    const appointment = await ctx.db.get(args.appointmentId);
    if (!appointment) return null;

    if (
      viewer.role !== "admin" &&
      viewer._id !== appointment.patientId &&
      viewer._id !== appointment.providerId
    ) {
      return null;
    }

    return appointment;
  },
});

// Get appointment by CometChat session ID
export const getBySessionId = query({
  args: { sessionId: v.string() },
  returns: v.union(appointmentValidator, v.null()),
  handler: async (ctx, args) => {
    const { user: viewer } = await getViewerOrThrow(ctx);
    requireActiveUser(viewer);

    const appointment = await ctx.db
      .query("appointments")
      .withIndex("by_cometChatSessionId", (q) =>
        q.eq("cometChatSessionId", args.sessionId)
      )
      .unique();

    if (!appointment) return null;

    if (
      viewer.role !== "admin" &&
      viewer._id !== appointment.patientId &&
      viewer._id !== appointment.providerId
    ) {
      return null;
    }

    return appointment;
  },
});

// Get patient's appointments
export const getByPatient = query({
  args: {
    patientId: v.id("users"),
    status: v.optional(appointmentStatusValidator),
  },
  returns: v.array(appointmentValidator),
  handler: async (ctx, args) => {
    const { user: viewer } = await getViewerOrThrow(ctx);
    requireActiveUser(viewer);

    if (viewer.role === "patient") {
      if (viewer._id !== args.patientId) {
        throw new Error("Forbidden");
      }
    } else if (viewer.role === "provider") {
      const relationship = await ctx.db
        .query("appointments")
        .withIndex("by_providerId_and_patientId", (q) =>
          q.eq("providerId", viewer._id).eq("patientId", args.patientId),
        )
        .take(1);

      if (relationship.length === 0) {
        throw new Error("Forbidden");
      }
    }

    // Patient gets all their appointments; provider sees only their appointments with this patient.
    if (viewer.role === "provider") {
      const appointments = await ctx.db
        .query("appointments")
        .withIndex("by_providerId_and_patientId", (q) =>
          q.eq("providerId", viewer._id).eq("patientId", args.patientId),
        )
        .collect();
      return args.status ? appointments.filter((a) => a.status === args.status) : appointments;
    }

    if (args.status) {
      return await ctx.db
        .query("appointments")
        .withIndex("by_patientId_and_status", (q) =>
          q.eq("patientId", args.patientId).eq("status", args.status!),
        )
        .collect();
    }

    return await ctx.db
      .query("appointments")
      .withIndex("by_patientId", (q) => q.eq("patientId", args.patientId))
      .collect();
  },
});

// Get provider's appointments
export const getByProvider = query({
  args: {
    providerId: v.id("users"),
    status: v.optional(appointmentStatusValidator),
  },
  returns: v.array(appointmentValidator),
  handler: async (ctx, args) => {
    const { user: viewer } = await getViewerOrThrow(ctx);
    requireActiveUser(viewer);

    if (!isAdmin(viewer) && viewer._id !== args.providerId) {
      throw new Error("Forbidden");
    }

    if (args.status) {
      return await ctx.db
        .query("appointments")
        .withIndex("by_providerId_and_status", (q) =>
          q.eq("providerId", args.providerId).eq("status", args.status!)
        )
        .collect();
    }
    return await ctx.db
      .query("appointments")
      .withIndex("by_providerId", (q) => q.eq("providerId", args.providerId))
      .collect();
  },
});

// Get today's appointments for provider
export const getTodayForProvider = query({
  args: {
    providerId: v.id("users"),
    todayStart: v.number(),
    todayEnd: v.number(),
  },
  returns: v.array(appointmentValidator),
  handler: async (ctx, args) => {
    const { user: viewer } = await getViewerOrThrow(ctx);
    requireActiveUser(viewer);

    if (!isAdmin(viewer) && viewer._id !== args.providerId) {
      throw new Error("Forbidden");
    }

    const appointments = await ctx.db
      .query("appointments")
      .withIndex("by_providerId_and_scheduledAt", (q) =>
        q
          .eq("providerId", args.providerId)
          .gte("scheduledAt", args.todayStart)
          .lte("scheduledAt", args.todayEnd)
      )
      .collect();

    return appointments.filter((apt) => apt.status === "upcoming");
  },
});

// Reschedule appointment
export const reschedule = mutation({
  args: {
    appointmentId: v.id("appointments"),
    newScheduledAt: v.number(),
    rescheduledBy: v.id("users"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { user: viewer } = await getViewerOrThrow(ctx);
    requireActiveUser(viewer);

    if (!isAdmin(viewer) && args.rescheduledBy !== viewer._id) {
      throw new Error("Forbidden");
    }

    const appointment = await ctx.db.get(args.appointmentId);
    if (!appointment) {
      throw new Error("Appointment not found");
    }

    if (
      !isAdmin(viewer) &&
      viewer._id !== appointment.patientId &&
      viewer._id !== appointment.providerId
    ) {
      throw new Error("Forbidden");
    }

    await ctx.db.patch(args.appointmentId, {
      scheduledAt: args.newScheduledAt,
      status: "unconfirmed",
      updatedAt: Date.now(),
    });

    return null;
  },
});

// Confirm rescheduled appointment
export const confirm = mutation({
  args: {
    appointmentId: v.id("appointments"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { user: viewer } = await getViewerOrThrow(ctx);
    requireActiveUser(viewer);
    requireRole(viewer, ["provider", "admin"]);

    const appointment = await ctx.db.get(args.appointmentId);
    if (!appointment) {
      throw new Error("Appointment not found");
    }

    if (!isAdmin(viewer) && viewer._id !== appointment.providerId) {
      throw new Error("Forbidden");
    }

    await ctx.db.patch(args.appointmentId, {
      status: "upcoming",
      updatedAt: Date.now(),
    });
    return null;
  },
});

// Cancel appointment
export const cancel = mutation({
  args: {
    appointmentId: v.id("appointments"),
    canceledBy: v.id("users"),
    cancelReason: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { user: viewer } = await getViewerOrThrow(ctx);
    requireActiveUser(viewer);

    const appointment = await ctx.db.get(args.appointmentId);
    if (!appointment) {
      throw new Error("Appointment not found");
    }

    if (!isAdmin(viewer) && args.canceledBy !== viewer._id) {
      throw new Error("Forbidden");
    }

    if (
      !isAdmin(viewer) &&
      viewer._id !== appointment.patientId &&
      viewer._id !== appointment.providerId
    ) {
      throw new Error("Forbidden");
    }

    await ctx.db.patch(args.appointmentId, {
      status: "canceled",
      canceledBy: args.canceledBy,
      cancelReason: args.cancelReason,
      updatedAt: Date.now(),
    });
    return null;
  },
});

// Mark appointment as completed
export const complete = mutation({
  args: { appointmentId: v.id("appointments") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { user: viewer } = await getViewerOrThrow(ctx);
    requireActiveUser(viewer);
    requireRole(viewer, ["provider", "admin"]);

    const appointment = await ctx.db.get(args.appointmentId);
    if (!appointment) {
      throw new Error("Appointment not found");
    }

    if (!isAdmin(viewer) && viewer._id !== appointment.providerId) {
      throw new Error("Forbidden");
    }

    await ctx.db.patch(args.appointmentId, {
      status: "completed",
      endedAt: Date.now(),
      updatedAt: Date.now(),
    });
    return null;
  },
});

// Update join status - when patient joins
export const patientJoined = mutation({
  args: { appointmentId: v.id("appointments") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { user: viewer } = await getViewerOrThrow(ctx);
    requireActiveUser(viewer);

    const appointment = await ctx.db.get(args.appointmentId);
    if (!appointment) {
      throw new Error("Appointment not found");
    }
    if (!isAdmin(viewer) && viewer._id !== appointment.patientId) {
      throw new Error("Forbidden");
    }

    await ctx.db.patch(args.appointmentId, {
      patientJoinedAt: Date.now(),
      updatedAt: Date.now(),
    });
    return null;
  },
});

// Update join status - when provider joins
export const providerJoined = mutation({
  args: { appointmentId: v.id("appointments") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { user: viewer } = await getViewerOrThrow(ctx);
    requireActiveUser(viewer);

    const appointment = await ctx.db.get(args.appointmentId);
    if (!appointment) {
      throw new Error("Appointment not found");
    }
    if (!isAdmin(viewer) && viewer._id !== appointment.providerId) {
      throw new Error("Forbidden");
    }

    await ctx.db.patch(args.appointmentId, {
      providerJoinedAt: Date.now(),
      updatedAt: Date.now(),
    });
    return null;
  },
});

// List all appointments (for admin)
export const listAll = query({
  args: {
    status: v.optional(appointmentStatusValidator),
  },
  returns: v.array(appointmentValidator),
  handler: async (ctx, args) => {
    const { user: viewer } = await getViewerOrThrow(ctx);
    requireActiveUser(viewer);
    requireRole(viewer, ["admin"]);

    if (args.status) {
      return await ctx.db
        .query("appointments")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .collect();
    }
    return await ctx.db.query("appointments").collect();
  },
});

// Get upcoming appointments count for provider
export const getUpcomingCount = query({
  args: { providerId: v.id("users") },
  returns: v.number(),
  handler: async (ctx, args) => {
    const { user: viewer } = await getViewerOrThrow(ctx);
    requireActiveUser(viewer);
    requireRole(viewer, ["provider", "admin"]);

    if (!isAdmin(viewer) && viewer._id !== args.providerId) {
      throw new Error("Forbidden");
    }

    const appointments = await ctx.db
      .query("appointments")
      .withIndex("by_providerId_and_status", (q) =>
        q.eq("providerId", args.providerId).eq("status", "upcoming")
      )
      .collect();
    return appointments.length;
  },
});

// Get appointments count by status (for admin dashboard)
export const getCountByStatus = query({
  args: {},
  returns: v.object({
    upcoming: v.number(),
    unconfirmed: v.number(),
    completed: v.number(),
    canceled: v.number(),
  }),
  handler: async (ctx) => {
    const { user: viewer } = await getViewerOrThrow(ctx);
    requireActiveUser(viewer);
    requireRole(viewer, ["admin"]);

    const upcoming = await ctx.db
      .query("appointments")
      .withIndex("by_status", (q) => q.eq("status", "upcoming"))
      .collect();
    const unconfirmed = await ctx.db
      .query("appointments")
      .withIndex("by_status", (q) => q.eq("status", "unconfirmed"))
      .collect();
    const completed = await ctx.db
      .query("appointments")
      .withIndex("by_status", (q) => q.eq("status", "completed"))
      .collect();
    const canceled = await ctx.db
      .query("appointments")
      .withIndex("by_status", (q) => q.eq("status", "canceled"))
      .collect();

    return {
      upcoming: upcoming.length,
      unconfirmed: unconfirmed.length,
      completed: completed.length,
      canceled: canceled.length,
    };
  },
});

// For patient booking UIs: return booked slots without PHI.
export const getBookedSlotsForProvider = query({
  args: {
    providerId: v.id("users"),
    startTs: v.number(),
    endTs: v.number(),
  },
  returns: v.array(v.number()),
  handler: async (ctx, args) => {
    const { user: viewer } = await getViewerOrThrow(ctx);
    requireActiveUser(viewer);

    const appointments = await ctx.db
      .query("appointments")
      .withIndex("by_providerId_and_scheduledAt", (q) =>
        q.eq("providerId", args.providerId).gte("scheduledAt", args.startTs).lt("scheduledAt", args.endTs),
      )
      .collect();

    return appointments
      .filter((a) => a.status !== "canceled")
      .map((a) => a.scheduledAt);
  },
});
