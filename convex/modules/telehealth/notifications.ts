import { v } from "convex/values";
import { query, mutation } from "../../_generated/server";
import { getViewerOrThrow, isAdmin, requireActiveUser, requireRole } from "../../lib/auth";

const notificationTypeValidator = v.union(
  v.literal("appointment"),
  v.literal("message"),
  v.literal("encounter"),
  v.literal("system")
);

const notificationValidator = v.object({
  _id: v.id("notifications"),
  _creationTime: v.number(),
  userId: v.id("users"),
  title: v.string(),
  body: v.string(),
  type: notificationTypeValidator,
  isRead: v.boolean(),
  actionUrl: v.optional(v.string()),
  metadata: v.optional(v.any()),
  createdAt: v.number(),
});

// Create notification
export const create = mutation({
  args: {
    userId: v.id("users"),
    title: v.string(),
    body: v.string(),
    type: notificationTypeValidator,
    actionUrl: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  returns: v.id("notifications"),
  handler: async (ctx, args) => {
    const { user: viewer } = await getViewerOrThrow(ctx);
    requireActiveUser(viewer);
    requireRole(viewer, ["admin"]);

    return await ctx.db.insert("notifications", {
      userId: args.userId,
      title: args.title,
      body: args.body,
      type: args.type,
      isRead: false,
      actionUrl: args.actionUrl,
      metadata: args.metadata,
      createdAt: Date.now(),
    });
  },
});

// Get user's notifications
export const getMyNotifications = query({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.number()),
  },
  returns: v.array(notificationValidator),
  handler: async (ctx, args) => {
    const { user: viewer } = await getViewerOrThrow(ctx);
    requireActiveUser(viewer);
    if (!isAdmin(viewer) && viewer._id !== args.userId) {
      throw new Error("Forbidden");
    }

    const query = ctx.db
      .query("notifications")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .order("desc");

    if (args.limit) {
      return await query.take(args.limit);
    }
    return await query.collect();
  },
});

// Get unread notifications
export const getUnread = query({
  args: { userId: v.id("users") },
  returns: v.array(notificationValidator),
  handler: async (ctx, args) => {
    const { user: viewer } = await getViewerOrThrow(ctx);
    requireActiveUser(viewer);
    if (!isAdmin(viewer) && viewer._id !== args.userId) {
      throw new Error("Forbidden");
    }

    return await ctx.db
      .query("notifications")
      .withIndex("by_userId_and_isRead", (q) =>
        q.eq("userId", args.userId).eq("isRead", false)
      )
      .order("desc")
      .collect();
  },
});

// Get unread count
export const getUnreadCount = query({
  args: { userId: v.id("users") },
  returns: v.number(),
  handler: async (ctx, args) => {
    const { user: viewer } = await getViewerOrThrow(ctx);
    requireActiveUser(viewer);
    if (!isAdmin(viewer) && viewer._id !== args.userId) {
      throw new Error("Forbidden");
    }

    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_userId_and_isRead", (q) =>
        q.eq("userId", args.userId).eq("isRead", false)
      )
      .collect();
    return unread.length;
  },
});

// Mark single notification as read
export const markRead = mutation({
  args: { notificationId: v.id("notifications") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { user: viewer } = await getViewerOrThrow(ctx);
    requireActiveUser(viewer);

    const notification = await ctx.db.get(args.notificationId);
    if (!notification) return null;
    if (!isAdmin(viewer) && notification.userId !== viewer._id) {
      throw new Error("Forbidden");
    }

    await ctx.db.patch(args.notificationId, { isRead: true });
    return null;
  },
});

// Mark all notifications as read
export const markAllRead = mutation({
  args: { userId: v.id("users") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { user: viewer } = await getViewerOrThrow(ctx);
    requireActiveUser(viewer);
    if (!isAdmin(viewer) && viewer._id !== args.userId) {
      throw new Error("Forbidden");
    }

    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_userId_and_isRead", (q) =>
        q.eq("userId", args.userId).eq("isRead", false)
      )
      .collect();

    for (const notification of unread) {
      await ctx.db.patch(notification._id, { isRead: true });
    }

    return null;
  },
});

// Delete notification
export const deleteNotification = mutation({
  args: { notificationId: v.id("notifications") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { user: viewer } = await getViewerOrThrow(ctx);
    requireActiveUser(viewer);

    const notification = await ctx.db.get(args.notificationId);
    if (!notification) return null;
    if (!isAdmin(viewer) && notification.userId !== viewer._id) {
      throw new Error("Forbidden");
    }

    await ctx.db.delete(args.notificationId);
    return null;
  },
});

// Delete all read notifications (cleanup)
export const deleteAllRead = mutation({
  args: { userId: v.id("users") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { user: viewer } = await getViewerOrThrow(ctx);
    requireActiveUser(viewer);
    if (!isAdmin(viewer) && viewer._id !== args.userId) {
      throw new Error("Forbidden");
    }

    const read = await ctx.db
      .query("notifications")
      .withIndex("by_userId_and_isRead", (q) =>
        q.eq("userId", args.userId).eq("isRead", true)
      )
      .collect();

    for (const notification of read) {
      await ctx.db.delete(notification._id);
    }

    return null;
  },
});

// Helper: Create appointment notification
export const createAppointmentNotification = mutation({
  args: {
    userId: v.id("users"),
    appointmentId: v.id("appointments"),
    action: v.union(
      v.literal("created"),
      v.literal("rescheduled"),
      v.literal("canceled"),
      v.literal("reminder")
    ),
    otherPartyName: v.string(),
  },
  returns: v.id("notifications"),
  handler: async (ctx, args) => {
    const { user: viewer } = await getViewerOrThrow(ctx);
    requireActiveUser(viewer);
    requireRole(viewer, ["admin"]);

    let title = "";
    let body = "";

    switch (args.action) {
      case "created":
        title = "New Appointment";
        body = `You have a new appointment scheduled with ${args.otherPartyName}`;
        break;
      case "rescheduled":
        title = "Appointment Rescheduled";
        body = `Your appointment with ${args.otherPartyName} has been rescheduled`;
        break;
      case "canceled":
        title = "Appointment Canceled";
        body = `Your appointment with ${args.otherPartyName} has been canceled`;
        break;
      case "reminder":
        title = "Appointment Reminder";
        body = `Your appointment with ${args.otherPartyName} starts in 15 minutes`;
        break;
    }

    return await ctx.db.insert("notifications", {
      userId: args.userId,
      title,
      body,
      type: "appointment",
      isRead: false,
      actionUrl: `/bookings/${args.appointmentId}`,
      metadata: { appointmentId: args.appointmentId, action: args.action },
      createdAt: Date.now(),
    });
  },
});

// Helper: Create message notification
export const createMessageNotification = mutation({
  args: {
    userId: v.id("users"),
    senderName: v.string(),
    messagePreview: v.optional(v.string()),
  },
  returns: v.id("notifications"),
  handler: async (ctx, args) => {
    const { user: viewer } = await getViewerOrThrow(ctx);
    requireActiveUser(viewer);
    requireRole(viewer, ["admin"]);

    return await ctx.db.insert("notifications", {
      userId: args.userId,
      title: `New message from ${args.senderName}`,
      body: args.messagePreview || "You have a new message",
      type: "message",
      isRead: false,
      actionUrl: "/messages",
      createdAt: Date.now(),
    });
  },
});

// Helper: Create encounter notification
export const createEncounterNotification = mutation({
  args: {
    userId: v.id("users"),
    encounterId: v.id("encounters"),
    providerName: v.string(),
  },
  returns: v.id("notifications"),
  handler: async (ctx, args) => {
    const { user: viewer } = await getViewerOrThrow(ctx);
    requireActiveUser(viewer);
    requireRole(viewer, ["admin"]);

    return await ctx.db.insert("notifications", {
      userId: args.userId,
      title: "Encounter Finalized",
      body: `Dr. ${args.providerName} has finalized your visit notes`,
      type: "encounter",
      isRead: false,
      actionUrl: `/health/encounters/${args.encounterId}`,
      metadata: { encounterId: args.encounterId },
      createdAt: Date.now(),
    });
  },
});
