import { v } from "convex/values";
import type { Id } from "../../_generated/dataModel";
import { query, mutation, type QueryCtx } from "../../_generated/server";
import { getViewerOrThrow, isAdmin, requireActiveUser, requireRole } from "../../lib/auth";

async function getPatientOwnerUserId(
  ctx: Pick<QueryCtx, "db">,
  patientIntakeId: Id<"patientIntake">,
): Promise<Id<"users">> {
  const intake = await ctx.db.get(patientIntakeId);
  if (!intake) {
    throw new Error("Patient intake not found");
  }
  return intake.userId;
}

async function requireProviderPatientRelationship(
  ctx: Pick<QueryCtx, "db">,
  providerId: Id<"users">,
  patientUserId: Id<"users">,
) {
  const relationship = await ctx.db
    .query("appointments")
    .withIndex("by_providerId_and_patientId", (q) =>
      q.eq("providerId", providerId).eq("patientId", patientUserId),
    )
    .take(1);

  if (relationship.length === 0) {
    throw new Error("Forbidden");
  }
}

const encounterStatusValidator = v.union(v.literal("draft"), v.literal("finalized"));

const encounterValidator = v.object({
  _id: v.id("encounters"),
  _creationTime: v.number(),
  patientId: v.id("patientIntake"),
  providerId: v.id("users"),
  appointmentId: v.optional(v.id("appointments")),
  encounterDate: v.string(),
  startedAt: v.number(),
  finalizedAt: v.optional(v.number()),
  status: encounterStatusValidator,
  chiefComplaint: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
});

const soapNoteValidator = v.object({
  _id: v.id("soapNotes"),
  _creationTime: v.number(),
  encounterId: v.id("encounters"),
  subjective: v.optional(v.string()),
  objective: v.optional(v.string()),
  assessment: v.optional(v.string()),
  plan: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
});

const addendumValidator = v.object({
  _id: v.id("encounterAddendums"),
  _creationTime: v.number(),
  encounterId: v.id("encounters"),
  authorId: v.id("users"),
  content: v.string(),
  createdAt: v.number(),
});

// Create new encounter
export const create = mutation({
  args: {
    patientId: v.id("patientIntake"),
    providerId: v.id("users"),
    appointmentId: v.optional(v.id("appointments")),
    chiefComplaint: v.optional(v.string()),
  },
  returns: v.id("encounters"),
  handler: async (ctx, args) => {
    const { user: viewer } = await getViewerOrThrow(ctx);
    requireActiveUser(viewer);
    requireRole(viewer, ["provider", "admin"]);

    if (!isAdmin(viewer) && viewer._id !== args.providerId) {
      throw new Error("Forbidden");
    }

    const patientUserId = await getPatientOwnerUserId(ctx, args.patientId);

    if (!isAdmin(viewer)) {
      await requireProviderPatientRelationship(ctx, viewer._id, patientUserId);
    }

    if (args.appointmentId) {
      const appointment = await ctx.db.get(args.appointmentId);
      if (!appointment) {
        throw new Error("Appointment not found");
      }
      if (
        appointment.patientId !== patientUserId ||
        appointment.providerId !== args.providerId
      ) {
        throw new Error("Forbidden");
      }
    }

    const now = Date.now();
    const encounterDate = new Date().toISOString().split("T")[0];

    const encounterId = await ctx.db.insert("encounters", {
      patientId: args.patientId,
      providerId: args.providerId,
      appointmentId: args.appointmentId,
      encounterDate,
      startedAt: now,
      status: "draft",
      chiefComplaint: args.chiefComplaint,
      createdAt: now,
      updatedAt: now,
    });

    // Create empty SOAP note
    await ctx.db.insert("soapNotes", {
      encounterId,
      createdAt: now,
      updatedAt: now,
    });

    return encounterId;
  },
});

// Get encounter by ID with SOAP notes
export const getById = query({
  args: { encounterId: v.id("encounters") },
  returns: v.union(
    v.object({
      encounter: encounterValidator,
      soapNote: v.union(soapNoteValidator, v.null()),
      addendums: v.array(addendumValidator),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const { user: viewer } = await getViewerOrThrow(ctx);
    requireActiveUser(viewer);

    const encounter = await ctx.db.get(args.encounterId);
    if (!encounter) return null;

    if (!isAdmin(viewer)) {
      const patientUserId = await getPatientOwnerUserId(ctx, encounter.patientId);
      const isProviderOwner = viewer._id === encounter.providerId;
      const isPatientOwner = viewer._id === patientUserId;
      if (!isProviderOwner && !isPatientOwner) {
        return null;
      }
    }

    const soapNote = await ctx.db
      .query("soapNotes")
      .withIndex("by_encounterId", (q) => q.eq("encounterId", args.encounterId))
      .unique();

    const addendums = await ctx.db
      .query("encounterAddendums")
      .withIndex("by_encounterId", (q) => q.eq("encounterId", args.encounterId))
      .collect();

    return { encounter, soapNote, addendums };
  },
});

// Update encounter chief complaint
export const updateChiefComplaint = mutation({
  args: {
    encounterId: v.id("encounters"),
    chiefComplaint: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { user: viewer } = await getViewerOrThrow(ctx);
    requireActiveUser(viewer);
    requireRole(viewer, ["provider", "admin"]);

    const encounter = await ctx.db.get(args.encounterId);
    if (!encounter) throw new Error("Encounter not found");
    if (!isAdmin(viewer) && viewer._id !== encounter.providerId) {
      throw new Error("Forbidden");
    }
    if (encounter.status === "finalized") {
      throw new Error("Cannot edit finalized encounter");
    }

    await ctx.db.patch(args.encounterId, {
      chiefComplaint: args.chiefComplaint,
      updatedAt: Date.now(),
    });
    return null;
  },
});

// Update SOAP note
export const updateSOAP = mutation({
  args: {
    encounterId: v.id("encounters"),
    subjective: v.optional(v.string()),
    objective: v.optional(v.string()),
    assessment: v.optional(v.string()),
    plan: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { user: viewer } = await getViewerOrThrow(ctx);
    requireActiveUser(viewer);
    requireRole(viewer, ["provider", "admin"]);

    const encounter = await ctx.db.get(args.encounterId);
    if (!encounter) throw new Error("Encounter not found");
    if (!isAdmin(viewer) && viewer._id !== encounter.providerId) {
      throw new Error("Forbidden");
    }
    if (encounter.status === "finalized") {
      throw new Error("Cannot edit finalized encounter");
    }

    const soapNote = await ctx.db
      .query("soapNotes")
      .withIndex("by_encounterId", (q) => q.eq("encounterId", args.encounterId))
      .unique();

    if (!soapNote) throw new Error("SOAP note not found");

    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.subjective !== undefined) updates.subjective = args.subjective;
    if (args.objective !== undefined) updates.objective = args.objective;
    if (args.assessment !== undefined) updates.assessment = args.assessment;
    if (args.plan !== undefined) updates.plan = args.plan;

    await ctx.db.patch(soapNote._id, updates);
    return null;
  },
});

// Finalize encounter
export const finalize = mutation({
  args: { encounterId: v.id("encounters") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { user: viewer } = await getViewerOrThrow(ctx);
    requireActiveUser(viewer);
    requireRole(viewer, ["provider", "admin"]);

    const encounter = await ctx.db.get(args.encounterId);
    if (!encounter) throw new Error("Encounter not found");
    if (!isAdmin(viewer) && viewer._id !== encounter.providerId) {
      throw new Error("Forbidden");
    }
    if (encounter.status === "finalized") {
      throw new Error("Encounter already finalized");
    }

    const now = Date.now();
    await ctx.db.patch(args.encounterId, {
      status: "finalized",
      finalizedAt: now,
      updatedAt: now,
    });
    return null;
  },
});

// Add addendum
export const addAddendum = mutation({
  args: {
    encounterId: v.id("encounters"),
    authorId: v.id("users"),
    content: v.string(),
  },
  returns: v.id("encounterAddendums"),
  handler: async (ctx, args) => {
    const { user: viewer } = await getViewerOrThrow(ctx);
    requireActiveUser(viewer);
    requireRole(viewer, ["provider", "admin"]);

    const encounter = await ctx.db.get(args.encounterId);
    if (!encounter) throw new Error("Encounter not found");
    if (!isAdmin(viewer) && viewer._id !== encounter.providerId) {
      throw new Error("Forbidden");
    }
    if (!isAdmin(viewer) && args.authorId !== viewer._id) {
      throw new Error("Forbidden");
    }

    return await ctx.db.insert("encounterAddendums", {
      encounterId: args.encounterId,
      authorId: args.authorId,
      content: args.content,
      createdAt: Date.now(),
    });
  },
});

// List encounters by patient
export const listByPatient = query({
  args: { patientId: v.id("patientIntake") },
  returns: v.array(encounterValidator),
  handler: async (ctx, args) => {
    const { user: viewer } = await getViewerOrThrow(ctx);
    requireActiveUser(viewer);

    if (!isAdmin(viewer)) {
      const patientUserId = await getPatientOwnerUserId(ctx, args.patientId);

      if (viewer.role === "patient") {
        if (viewer._id !== patientUserId) {
          throw new Error("Forbidden");
        }
      } else {
        requireRole(viewer, ["provider"]);
        await requireProviderPatientRelationship(ctx, viewer._id, patientUserId);
      }
    }

    return await ctx.db
      .query("encounters")
      .withIndex("by_patientId", (q) => q.eq("patientId", args.patientId))
      .order("desc")
      .collect();
  },
});

// List encounters by provider
export const listByProvider = query({
  args: {
    providerId: v.id("users"),
    status: v.optional(encounterStatusValidator),
  },
  returns: v.array(encounterValidator),
  handler: async (ctx, args) => {
    const { user: viewer } = await getViewerOrThrow(ctx);
    requireActiveUser(viewer);
    requireRole(viewer, ["provider", "admin"]);

    if (!isAdmin(viewer) && viewer._id !== args.providerId) {
      throw new Error("Forbidden");
    }

    const encounters = await ctx.db
      .query("encounters")
      .withIndex("by_providerId", (q) => q.eq("providerId", args.providerId))
      .order("desc")
      .collect();

    if (args.status) {
      return encounters.filter((e) => e.status === args.status);
    }
    return encounters;
  },
});

// Get draft encounters count for provider
export const getDraftCount = query({
  args: { providerId: v.id("users") },
  returns: v.number(),
  handler: async (ctx, args) => {
    const { user: viewer } = await getViewerOrThrow(ctx);
    requireActiveUser(viewer);
    requireRole(viewer, ["provider", "admin"]);

    if (!isAdmin(viewer) && viewer._id !== args.providerId) {
      throw new Error("Forbidden");
    }

    const drafts = await ctx.db
      .query("encounters")
      .withIndex("by_providerId", (q) => q.eq("providerId", args.providerId))
      .collect();
    return drafts.filter((e) => e.status === "draft").length;
  },
});

// Get encounter by appointment ID
export const getByAppointmentId = query({
  args: { appointmentId: v.id("appointments") },
  returns: v.union(encounterValidator, v.null()),
  handler: async (ctx, args) => {
    const { user: viewer } = await getViewerOrThrow(ctx);
    requireActiveUser(viewer);

    const encounter = await ctx.db
      .query("encounters")
      .withIndex("by_appointmentId", (q) => q.eq("appointmentId", args.appointmentId))
      .unique();

    if (!encounter) return null;

    if (!isAdmin(viewer)) {
      const patientUserId = await getPatientOwnerUserId(ctx, encounter.patientId);
      const isProviderOwner = viewer._id === encounter.providerId;
      const isPatientOwner = viewer._id === patientUserId;
      if (!isProviderOwner && !isPatientOwner) {
        return null;
      }
    }

    return encounter;
  },
});

// Admin: list all encounters (latest first).
export const listAllForAdmin = query({
  args: {},
  returns: v.array(encounterValidator),
  handler: async (ctx) => {
    const { user: viewer } = await getViewerOrThrow(ctx);
    requireActiveUser(viewer);
    requireRole(viewer, ["admin"]);

    return await ctx.db.query("encounters").order("desc").collect();
  },
});
