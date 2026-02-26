import { v } from "convex/values";
import type { Id } from "../../_generated/dataModel";
import { query, mutation, type QueryCtx } from "../../_generated/server";
import { replaceIntakeSourcedMedicalHistory } from "./_medicalHistoryIntakeSync";
import {
  getViewerOrThrow,
  isAdmin,
  requireActiveUser,
  requireRole,
  type UserDoc,
} from "../../lib/auth";

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

async function requireAccessToPatient(
  ctx: Pick<QueryCtx, "db">,
  viewer: UserDoc,
  patientIntakeId: Id<"patientIntake">,
) {
  const patientUserId = await getPatientOwnerUserId(ctx, patientIntakeId);
  if (isAdmin(viewer)) return;

  if (viewer.role === "patient") {
    if (viewer._id !== patientUserId) {
      throw new Error("Forbidden");
    }
    return;
  }

  if (viewer.role === "provider") {
    const relationship = await ctx.db
      .query("appointments")
      .withIndex("by_providerId_and_patientId", (q) =>
        q.eq("providerId", viewer._id).eq("patientId", patientUserId),
      )
      .take(1);

    if (relationship.length === 0) {
      throw new Error("Forbidden");
    }
    return;
  }

  throw new Error("Forbidden");
}

const medicalHistorySourceValidator = v.optional(
  v.union(v.literal("intake"), v.literal("provider"), v.literal("admin")),
);

// Medical Conditions
const conditionStatusValidator = v.union(
  v.literal("active"),
  v.literal("resolved"),
  v.literal("chronic")
);

const conditionSeverityValidator = v.union(
  v.literal("mild"),
  v.literal("moderate"),
  v.literal("severe")
);

const conditionValidator = v.object({
  _id: v.id("medicalConditions"),
  _creationTime: v.number(),
  patientId: v.id("patientIntake"),
  conditionName: v.string(),
  icdCode: v.optional(v.string()),
  dateOfOnset: v.optional(v.string()),
  status: conditionStatusValidator,
  severity: v.optional(conditionSeverityValidator),
  notes: v.optional(v.string()),
  source: medicalHistorySourceValidator,
  createdAt: v.number(),
  updatedAt: v.number(),
});

// Medications
const medicationStatusValidator = v.union(
  v.literal("active"),
  v.literal("discontinued"),
  v.literal("completed")
);

const medicationValidator = v.object({
  _id: v.id("medications"),
  _creationTime: v.number(),
  patientId: v.id("patientIntake"),
  medicationName: v.string(),
  rxNormCode: v.optional(v.string()),
  startDate: v.string(),
  endDate: v.optional(v.string()),
  status: medicationStatusValidator,
  dosage: v.string(),
  frequency: v.string(),
  source: medicalHistorySourceValidator,
  createdAt: v.number(),
  updatedAt: v.number(),
});

// Allergies
const allergenTypeValidator = v.union(
  v.literal("medication"),
  v.literal("food"),
  v.literal("environmental"),
  v.literal("other")
);

const allergySeverityValidator = v.union(
  v.literal("mild"),
  v.literal("moderate"),
  v.literal("severe"),
  v.literal("life_threatening")
);

const allergyValidator = v.object({
  _id: v.id("allergies"),
  _creationTime: v.number(),
  patientId: v.id("patientIntake"),
  allergenName: v.string(),
  allergenType: allergenTypeValidator,
  reactionType: v.string(),
  severity: allergySeverityValidator,
  notes: v.optional(v.string()),
  source: medicalHistorySourceValidator,
  createdAt: v.number(),
  updatedAt: v.number(),
});

export const syncFromIntake = mutation({
  args: { patientId: v.id("patientIntake") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { user: viewer } = await getViewerOrThrow(ctx);
    requireActiveUser(viewer);
    await requireAccessToPatient(ctx, viewer, args.patientId);

    const intake = await ctx.db.get(args.patientId);
    if (!intake) {
      throw new Error("Patient intake not found");
    }

    await replaceIntakeSourcedMedicalHistory(ctx, {
      patientIntakeId: args.patientId,
      medicalConditions: intake.medicalConditions,
      medications: intake.medications,
      allergies: intake.allergies,
      skipped: intake.medicalHistorySkipped === true,
      source: "intake",
    });

    return null;
  },
});

export const patientAddMedication = mutation({
  args: {
    patientId: v.id("patientIntake"),
    medicationName: v.string(),
    dosage: v.optional(v.string()),
    frequency: v.optional(v.string()),
    startDate: v.optional(v.string()),
  },
  returns: v.id("medications"),
  handler: async (ctx, args) => {
    const { user: viewer } = await getViewerOrThrow(ctx);
    requireActiveUser(viewer);
    requireRole(viewer, ["patient"]);
    await requireAccessToPatient(ctx, viewer, args.patientId);

    const now = Date.now();
    const startDate = args.startDate ?? new Date().toISOString().split("T")[0];

    const medicationName = args.medicationName.trim();
    if (!medicationName) {
      throw new Error("Medication name is required");
    }

    return await ctx.db.insert("medications", {
      patientId: args.patientId,
      medicationName,
      startDate,
      status: "active",
      dosage: args.dosage?.trim() || "Unknown",
      frequency: args.frequency?.trim() || "As needed",
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const patientAddCondition = mutation({
  args: {
    patientId: v.id("patientIntake"),
    conditionName: v.string(),
    dateOfOnset: v.optional(v.string()),
    status: v.optional(conditionStatusValidator),
    severity: v.optional(conditionSeverityValidator),
    notes: v.optional(v.string()),
  },
  returns: v.id("medicalConditions"),
  handler: async (ctx, args) => {
    const { user: viewer } = await getViewerOrThrow(ctx);
    requireActiveUser(viewer);
    requireRole(viewer, ["patient"]);
    await requireAccessToPatient(ctx, viewer, args.patientId);

    const conditionName = args.conditionName.trim();
    if (!conditionName) {
      throw new Error("Condition name is required");
    }

    const now = Date.now();
    return await ctx.db.insert("medicalConditions", {
      patientId: args.patientId,
      conditionName,
      dateOfOnset: args.dateOfOnset,
      status: args.status ?? "active",
      severity: args.severity,
      notes: args.notes?.trim() || undefined,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const patientAddAllergy = mutation({
  args: {
    patientId: v.id("patientIntake"),
    allergenName: v.string(),
    allergenType: v.optional(allergenTypeValidator),
    reactionType: v.optional(v.string()),
    severity: allergySeverityValidator,
    notes: v.optional(v.string()),
  },
  returns: v.id("allergies"),
  handler: async (ctx, args) => {
    const { user: viewer } = await getViewerOrThrow(ctx);
    requireActiveUser(viewer);
    requireRole(viewer, ["patient"]);
    await requireAccessToPatient(ctx, viewer, args.patientId);

    const allergenName = args.allergenName.trim();
    if (!allergenName) {
      throw new Error("Allergen name is required");
    }

    const now = Date.now();
    return await ctx.db.insert("allergies", {
      patientId: args.patientId,
      allergenName,
      allergenType: args.allergenType ?? "other",
      reactionType: args.reactionType?.trim() || "Unknown",
      severity: args.severity,
      notes: args.notes?.trim() || undefined,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// === MEDICAL CONDITIONS ===

export const addCondition = mutation({
  args: {
    patientId: v.id("patientIntake"),
    conditionName: v.string(),
    icdCode: v.optional(v.string()),
    dateOfOnset: v.optional(v.string()),
    status: conditionStatusValidator,
    severity: v.optional(conditionSeverityValidator),
    notes: v.optional(v.string()),
  },
  returns: v.id("medicalConditions"),
  handler: async (ctx, args) => {
    const { user: viewer } = await getViewerOrThrow(ctx);
    requireActiveUser(viewer);
    requireRole(viewer, ["provider", "admin"]);
    await requireAccessToPatient(ctx, viewer, args.patientId);

    const now = Date.now();
    return await ctx.db.insert("medicalConditions", {
      ...args,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateCondition = mutation({
  args: {
    conditionId: v.id("medicalConditions"),
    conditionName: v.optional(v.string()),
    icdCode: v.optional(v.string()),
    dateOfOnset: v.optional(v.string()),
    status: v.optional(conditionStatusValidator),
    severity: v.optional(conditionSeverityValidator),
    notes: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { user: viewer } = await getViewerOrThrow(ctx);
    requireActiveUser(viewer);
    requireRole(viewer, ["provider", "admin"]);

    const existing = await ctx.db.get(args.conditionId);
    if (!existing) throw new Error("Condition not found");
    await requireAccessToPatient(ctx, viewer, existing.patientId);

    const { conditionId, ...updates } = args;
    const filteredUpdates: Record<string, unknown> = { updatedAt: Date.now() };

    if (updates.conditionName !== undefined) filteredUpdates.conditionName = updates.conditionName;
    if (updates.icdCode !== undefined) filteredUpdates.icdCode = updates.icdCode;
    if (updates.dateOfOnset !== undefined) filteredUpdates.dateOfOnset = updates.dateOfOnset;
    if (updates.status !== undefined) filteredUpdates.status = updates.status;
    if (updates.severity !== undefined) filteredUpdates.severity = updates.severity;
    if (updates.notes !== undefined) filteredUpdates.notes = updates.notes;

    await ctx.db.patch(conditionId, filteredUpdates);
    return null;
  },
});

export const deleteCondition = mutation({
  args: { conditionId: v.id("medicalConditions") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { user: viewer } = await getViewerOrThrow(ctx);
    requireActiveUser(viewer);
    requireRole(viewer, ["provider", "admin"]);

    const existing = await ctx.db.get(args.conditionId);
    if (!existing) throw new Error("Condition not found");
    await requireAccessToPatient(ctx, viewer, existing.patientId);

    await ctx.db.delete(args.conditionId);
    return null;
  },
});

export const getConditionsByPatient = query({
  args: {
    patientId: v.id("patientIntake"),
    status: v.optional(conditionStatusValidator),
  },
  returns: v.array(conditionValidator),
  handler: async (ctx, args) => {
    const { user: viewer } = await getViewerOrThrow(ctx);
    requireActiveUser(viewer);
    await requireAccessToPatient(ctx, viewer, args.patientId);

    if (args.status) {
      return await ctx.db
        .query("medicalConditions")
        .withIndex("by_patientId_and_status", (q) =>
          q.eq("patientId", args.patientId).eq("status", args.status!)
        )
        .collect();
    }
    return await ctx.db
      .query("medicalConditions")
      .withIndex("by_patientId", (q) => q.eq("patientId", args.patientId))
      .collect();
  },
});

// === MEDICATIONS ===

export const addMedication = mutation({
  args: {
    patientId: v.id("patientIntake"),
    medicationName: v.string(),
    rxNormCode: v.optional(v.string()),
    startDate: v.string(),
    endDate: v.optional(v.string()),
    status: medicationStatusValidator,
    dosage: v.string(),
    frequency: v.string(),
  },
  returns: v.id("medications"),
  handler: async (ctx, args) => {
    const { user: viewer } = await getViewerOrThrow(ctx);
    requireActiveUser(viewer);
    requireRole(viewer, ["provider", "admin"]);
    await requireAccessToPatient(ctx, viewer, args.patientId);

    const now = Date.now();
    return await ctx.db.insert("medications", {
      ...args,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateMedication = mutation({
  args: {
    medicationId: v.id("medications"),
    medicationName: v.optional(v.string()),
    rxNormCode: v.optional(v.string()),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    status: v.optional(medicationStatusValidator),
    dosage: v.optional(v.string()),
    frequency: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { user: viewer } = await getViewerOrThrow(ctx);
    requireActiveUser(viewer);
    requireRole(viewer, ["provider", "admin"]);

    const existing = await ctx.db.get(args.medicationId);
    if (!existing) throw new Error("Medication not found");
    await requireAccessToPatient(ctx, viewer, existing.patientId);

    const { medicationId, ...updates } = args;
    const filteredUpdates: Record<string, unknown> = { updatedAt: Date.now() };

    if (updates.medicationName !== undefined) filteredUpdates.medicationName = updates.medicationName;
    if (updates.rxNormCode !== undefined) filteredUpdates.rxNormCode = updates.rxNormCode;
    if (updates.startDate !== undefined) filteredUpdates.startDate = updates.startDate;
    if (updates.endDate !== undefined) filteredUpdates.endDate = updates.endDate;
    if (updates.status !== undefined) filteredUpdates.status = updates.status;
    if (updates.dosage !== undefined) filteredUpdates.dosage = updates.dosage;
    if (updates.frequency !== undefined) filteredUpdates.frequency = updates.frequency;

    await ctx.db.patch(medicationId, filteredUpdates);
    return null;
  },
});

export const deleteMedication = mutation({
  args: { medicationId: v.id("medications") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { user: viewer } = await getViewerOrThrow(ctx);
    requireActiveUser(viewer);
    requireRole(viewer, ["provider", "admin"]);

    const existing = await ctx.db.get(args.medicationId);
    if (!existing) throw new Error("Medication not found");
    await requireAccessToPatient(ctx, viewer, existing.patientId);

    await ctx.db.delete(args.medicationId);
    return null;
  },
});

export const getMedicationsByPatient = query({
  args: {
    patientId: v.id("patientIntake"),
    status: v.optional(medicationStatusValidator),
  },
  returns: v.array(medicationValidator),
  handler: async (ctx, args) => {
    const { user: viewer } = await getViewerOrThrow(ctx);
    requireActiveUser(viewer);
    await requireAccessToPatient(ctx, viewer, args.patientId);

    if (args.status) {
      return await ctx.db
        .query("medications")
        .withIndex("by_patientId_and_status", (q) =>
          q.eq("patientId", args.patientId).eq("status", args.status!)
        )
        .collect();
    }
    return await ctx.db
      .query("medications")
      .withIndex("by_patientId", (q) => q.eq("patientId", args.patientId))
      .collect();
  },
});

// === ALLERGIES ===

export const addAllergy = mutation({
  args: {
    patientId: v.id("patientIntake"),
    allergenName: v.string(),
    allergenType: allergenTypeValidator,
    reactionType: v.string(),
    severity: allergySeverityValidator,
    notes: v.optional(v.string()),
  },
  returns: v.id("allergies"),
  handler: async (ctx, args) => {
    const { user: viewer } = await getViewerOrThrow(ctx);
    requireActiveUser(viewer);
    requireRole(viewer, ["provider", "admin"]);
    await requireAccessToPatient(ctx, viewer, args.patientId);

    const now = Date.now();
    return await ctx.db.insert("allergies", {
      ...args,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateAllergy = mutation({
  args: {
    allergyId: v.id("allergies"),
    allergenName: v.optional(v.string()),
    allergenType: v.optional(allergenTypeValidator),
    reactionType: v.optional(v.string()),
    severity: v.optional(allergySeverityValidator),
    notes: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { user: viewer } = await getViewerOrThrow(ctx);
    requireActiveUser(viewer);
    requireRole(viewer, ["provider", "admin"]);

    const existing = await ctx.db.get(args.allergyId);
    if (!existing) throw new Error("Allergy not found");
    await requireAccessToPatient(ctx, viewer, existing.patientId);

    const { allergyId, ...updates } = args;
    const filteredUpdates: Record<string, unknown> = { updatedAt: Date.now() };

    if (updates.allergenName !== undefined) filteredUpdates.allergenName = updates.allergenName;
    if (updates.allergenType !== undefined) filteredUpdates.allergenType = updates.allergenType;
    if (updates.reactionType !== undefined) filteredUpdates.reactionType = updates.reactionType;
    if (updates.severity !== undefined) filteredUpdates.severity = updates.severity;
    if (updates.notes !== undefined) filteredUpdates.notes = updates.notes;

    await ctx.db.patch(allergyId, filteredUpdates);
    return null;
  },
});

export const deleteAllergy = mutation({
  args: { allergyId: v.id("allergies") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { user: viewer } = await getViewerOrThrow(ctx);
    requireActiveUser(viewer);
    requireRole(viewer, ["provider", "admin"]);

    const existing = await ctx.db.get(args.allergyId);
    if (!existing) throw new Error("Allergy not found");
    await requireAccessToPatient(ctx, viewer, existing.patientId);

    await ctx.db.delete(args.allergyId);
    return null;
  },
});

export const getAllergiesByPatient = query({
  args: {
    patientId: v.id("patientIntake"),
    severity: v.optional(allergySeverityValidator),
  },
  returns: v.array(allergyValidator),
  handler: async (ctx, args) => {
    const { user: viewer } = await getViewerOrThrow(ctx);
    requireActiveUser(viewer);
    await requireAccessToPatient(ctx, viewer, args.patientId);

    if (args.severity) {
      return await ctx.db
        .query("allergies")
        .withIndex("by_patientId_and_severity", (q) =>
          q.eq("patientId", args.patientId).eq("severity", args.severity!)
        )
        .collect();
    }
    return await ctx.db
      .query("allergies")
      .withIndex("by_patientId", (q) => q.eq("patientId", args.patientId))
      .collect();
  },
});

// Get severe/life-threatening allergies for a patient (for alerts)
export const getSevereAllergies = query({
  args: { patientId: v.id("patientIntake") },
  returns: v.array(allergyValidator),
  handler: async (ctx, args) => {
    const { user: viewer } = await getViewerOrThrow(ctx);
    requireActiveUser(viewer);
    await requireAccessToPatient(ctx, viewer, args.patientId);

    const allergies = await ctx.db
      .query("allergies")
      .withIndex("by_patientId", (q) => q.eq("patientId", args.patientId))
      .collect();

    return allergies.filter(
      (a) => a.severity === "severe" || a.severity === "life_threatening"
    );
  },
});

// Get complete medical summary for patient
export const getMedicalSummary = query({
  args: { patientId: v.id("patientIntake") },
  returns: v.object({
    conditions: v.array(conditionValidator),
    medications: v.array(medicationValidator),
    allergies: v.array(allergyValidator),
  }),
  handler: async (ctx, args) => {
    const { user: viewer } = await getViewerOrThrow(ctx);
    requireActiveUser(viewer);
    await requireAccessToPatient(ctx, viewer, args.patientId);

    const conditions = await ctx.db
      .query("medicalConditions")
      .withIndex("by_patientId", (q) => q.eq("patientId", args.patientId))
      .collect();

    const medications = await ctx.db
      .query("medications")
      .withIndex("by_patientId", (q) => q.eq("patientId", args.patientId))
      .collect();

    const allergies = await ctx.db
      .query("allergies")
      .withIndex("by_patientId", (q) => q.eq("patientId", args.patientId))
      .collect();

    return { conditions, medications, allergies };
  },
});
