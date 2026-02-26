import { v } from "convex/values";
import { query, mutation } from "../../_generated/server";
import { getViewerOrThrow, requireActiveUser, requireRole } from "../../lib/auth";
import { replaceIntakeSourcedMedicalHistory } from "./_medicalHistoryIntakeSync";

// Validators for embedded types
const medicalConditionValidator = v.object({
  name: v.string(),
  onsetDate: v.optional(v.string()),
  status: v.optional(v.union(v.literal("active"), v.literal("resolved"), v.literal("managed"))),
  severity: v.optional(v.union(v.literal("mild"), v.literal("moderate"), v.literal("severe"))),
});

const medicationValidator = v.object({
  name: v.string(),
  dosage: v.optional(v.string()),
  frequency: v.optional(v.union(
    v.literal("daily"),
    v.literal("twice_daily"),
    v.literal("weekly"),
    v.literal("as_needed")
  )),
  startDate: v.optional(v.string()),
});

const allergyValidator = v.object({
  allergen: v.string(),
  reaction: v.optional(v.string()),
  severity: v.union(
    v.literal("mild"),
    v.literal("moderate"),
    v.literal("severe"),
    v.literal("life_threatening")
  ),
});

// Get current patient's intake
export const getMyIntake = query({
  args: { userId: v.id("users") },
  returns: v.union(
    v.object({
      _id: v.id("patientIntake"),
      _creationTime: v.number(),
      userId: v.id("users"),
      firstName: v.string(),
      lastName: v.string(),
      dateOfBirth: v.string(),
      sexAtBirth: v.union(v.literal("male"), v.literal("female")),
      phone: v.string(),
      email: v.string(),
      preferredLanguage: v.union(v.literal("english"), v.literal("spanish")),
      weightLbs: v.optional(v.number()),
      heightFt: v.optional(v.number()),
      heightIn: v.optional(v.number()),
      avatarStorageId: v.optional(v.id("_storage")),
      street: v.optional(v.string()),
      aptSuiteUnit: v.optional(v.string()),
      city: v.optional(v.string()),
      state: v.optional(v.string()),
      zipCode: v.optional(v.string()),
      insuranceProvider: v.optional(v.string()),
      policyNumber: v.optional(v.string()),
      groupNumber: v.optional(v.string()),
      policyholderName: v.optional(v.string()),
      relationshipToPatient: v.optional(v.string()),
      coverageEffectiveDate: v.optional(v.string()),
      insuranceCardFrontStorageId: v.optional(v.id("_storage")),
      insuranceCardBackStorageId: v.optional(v.id("_storage")),
      medicalConditions: v.optional(v.array(medicalConditionValidator)),
      medications: v.optional(v.array(medicationValidator)),
      allergies: v.optional(v.array(allergyValidator)),
      medicalHistorySkipped: v.optional(v.boolean()),
      telehealthConsentAccepted: v.optional(v.boolean()),
      telehealthConsentDate: v.optional(v.number()),
      hipaaConsentAccepted: v.optional(v.boolean()),
      hipaaConsentDate: v.optional(v.number()),
      intakeCompleted: v.boolean(),
      intakeStep: v.number(),
      cometChatUid: v.optional(v.string()),
      createdAt: v.number(),
      updatedAt: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const { user: viewer } = await getViewerOrThrow(ctx);
    requireActiveUser(viewer);
    requireRole(viewer, ["patient"]);

    if (viewer._id !== args.userId) {
      throw new Error("Forbidden");
    }

    return await ctx.db
      .query("patientIntake")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique();
  },
});

// Initialize intake record for new patient
export const initializeIntake = mutation({
  args: {
    userId: v.id("users"),
    email: v.string(),
  },
  returns: v.id("patientIntake"),
  handler: async (ctx, args) => {
    const { user: viewer } = await getViewerOrThrow(ctx);
    requireActiveUser(viewer);
    requireRole(viewer, ["patient"]);

    if (viewer._id !== args.userId) {
      throw new Error("Forbidden");
    }

    // Check if intake already exists
    const existing = await ctx.db
      .query("patientIntake")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique();

    if (existing) {
      return existing._id;
    }

    const now = Date.now();
    return await ctx.db.insert("patientIntake", {
      userId: args.userId,
      firstName: "",
      lastName: "",
      dateOfBirth: "",
      sexAtBirth: "male",
      phone: "",
      email: args.email,
      preferredLanguage: "english",
      intakeCompleted: false,
      intakeStep: 1,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Update Step 1: Personal Information
export const updatePersonalInfo = mutation({
  args: {
    intakeId: v.id("patientIntake"),
    firstName: v.string(),
    lastName: v.string(),
    dateOfBirth: v.string(),
    sexAtBirth: v.union(v.literal("male"), v.literal("female")),
    phone: v.string(),
    preferredLanguage: v.union(v.literal("english"), v.literal("spanish")),
    weightLbs: v.optional(v.number()),
    heightFt: v.optional(v.number()),
    heightIn: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { user: viewer } = await getViewerOrThrow(ctx);
    requireActiveUser(viewer);
    requireRole(viewer, ["patient"]);

    const intake = await ctx.db.get(args.intakeId);
    if (!intake) throw new Error("Intake not found");
    if (intake.userId !== viewer._id) throw new Error("Forbidden");

    const { intakeId, ...data } = args;
    await ctx.db.patch(intakeId, {
      ...data,
      intakeStep: Math.max(intake.intakeStep || 1, 2),
      updatedAt: Date.now(),
    });
    return null;
  },
});

// Update Step 2: Address
export const updateAddress = mutation({
  args: {
    intakeId: v.id("patientIntake"),
    street: v.string(),
    aptSuiteUnit: v.optional(v.string()),
    city: v.string(),
    state: v.string(),
    zipCode: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { user: viewer } = await getViewerOrThrow(ctx);
    requireActiveUser(viewer);
    requireRole(viewer, ["patient"]);

    const intake = await ctx.db.get(args.intakeId);
    if (!intake) throw new Error("Intake not found");
    if (intake.userId !== viewer._id) throw new Error("Forbidden");

    const { intakeId, ...data } = args;
    await ctx.db.patch(intakeId, {
      ...data,
      intakeStep: Math.max(intake.intakeStep || 1, 3),
      updatedAt: Date.now(),
    });
    return null;
  },
});

// Update Step 3: Insurance
export const updateInsurance = mutation({
  args: {
    intakeId: v.id("patientIntake"),
    insuranceProvider: v.optional(v.string()),
    policyNumber: v.optional(v.string()),
    groupNumber: v.optional(v.string()),
    policyholderName: v.optional(v.string()),
    relationshipToPatient: v.optional(v.string()),
    coverageEffectiveDate: v.optional(v.string()),
    insuranceCardFrontStorageId: v.optional(v.id("_storage")),
    insuranceCardBackStorageId: v.optional(v.id("_storage")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { user: viewer } = await getViewerOrThrow(ctx);
    requireActiveUser(viewer);
    requireRole(viewer, ["patient"]);

    const intake = await ctx.db.get(args.intakeId);
    if (!intake) throw new Error("Intake not found");
    if (intake.userId !== viewer._id) throw new Error("Forbidden");

    const { intakeId, ...data } = args;
    await ctx.db.patch(intakeId, {
      ...data,
      intakeStep: Math.max(intake.intakeStep || 1, 4),
      updatedAt: Date.now(),
    });
    return null;
  },
});

// Update Step 4: Medical History
export const updateMedicalHistory = mutation({
  args: {
    intakeId: v.id("patientIntake"),
    medicalConditions: v.optional(v.array(medicalConditionValidator)),
    medications: v.optional(v.array(medicationValidator)),
    allergies: v.optional(v.array(allergyValidator)),
    medicalHistorySkipped: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { user: viewer } = await getViewerOrThrow(ctx);
    requireActiveUser(viewer);
    requireRole(viewer, ["patient"]);

    const intake = await ctx.db.get(args.intakeId);
    if (!intake) throw new Error("Intake not found");
    if (intake.userId !== viewer._id) throw new Error("Forbidden");

    const { intakeId, ...data } = args;
    await ctx.db.patch(intakeId, {
      ...data,
      intakeStep: Math.max(intake.intakeStep || 1, 5),
      updatedAt: Date.now(),
    });

    await replaceIntakeSourcedMedicalHistory(ctx, {
      patientIntakeId: intakeId,
      medicalConditions: args.medicalConditions,
      medications: args.medications,
      allergies: args.allergies,
      skipped: args.medicalHistorySkipped === true,
      source: "intake",
    });
    return null;
  },
});

// Update Step 5: Consent
export const updateConsent = mutation({
  args: {
    intakeId: v.id("patientIntake"),
    telehealthConsentAccepted: v.boolean(),
    hipaaConsentAccepted: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { user: viewer } = await getViewerOrThrow(ctx);
    requireActiveUser(viewer);
    requireRole(viewer, ["patient"]);

    const intake = await ctx.db.get(args.intakeId);
    if (!intake) throw new Error("Intake not found");
    if (intake.userId !== viewer._id) throw new Error("Forbidden");

    const now = Date.now();
    await ctx.db.patch(args.intakeId, {
      telehealthConsentAccepted: args.telehealthConsentAccepted,
      telehealthConsentDate: args.telehealthConsentAccepted ? now : undefined,
      hipaaConsentAccepted: args.hipaaConsentAccepted,
      hipaaConsentDate: args.hipaaConsentAccepted ? now : undefined,
      intakeStep: Math.max(intake.intakeStep || 1, 6),
      updatedAt: now,
    });
    return null;
  },
});

// Complete intake
export const completeIntake = mutation({
  args: { intakeId: v.id("patientIntake") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { user: viewer } = await getViewerOrThrow(ctx);
    requireActiveUser(viewer);
    requireRole(viewer, ["patient"]);

    const intake = await ctx.db.get(args.intakeId);
    if (!intake) throw new Error("Intake not found");
    if (intake.userId !== viewer._id) throw new Error("Forbidden");

    await ctx.db.patch(args.intakeId, {
      intakeCompleted: true,
      updatedAt: Date.now(),
    });
    return null;
  },
});

// Navigate to specific step
export const goToStep = mutation({
  args: {
    intakeId: v.id("patientIntake"),
    step: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { user: viewer } = await getViewerOrThrow(ctx);
    requireActiveUser(viewer);
    requireRole(viewer, ["patient"]);

    const intake = await ctx.db.get(args.intakeId);
    if (!intake) throw new Error("Intake not found");
    if (intake.userId !== viewer._id) throw new Error("Forbidden");

    await ctx.db.patch(args.intakeId, {
      intakeStep: args.step,
      updatedAt: Date.now(),
    });
    return null;
  },
});

// Upload avatar
export const updateAvatar = mutation({
  args: {
    intakeId: v.id("patientIntake"),
    avatarStorageId: v.id("_storage"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { user: viewer } = await getViewerOrThrow(ctx);
    requireActiveUser(viewer);
    requireRole(viewer, ["patient"]);

    const intake = await ctx.db.get(args.intakeId);
    if (!intake) throw new Error("Intake not found");
    if (intake.userId !== viewer._id) throw new Error("Forbidden");

    await ctx.db.patch(args.intakeId, {
      avatarStorageId: args.avatarStorageId,
      updatedAt: Date.now(),
    });
    return null;
  },
});

// Generate upload URL
export const generateUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    const { user: viewer } = await getViewerOrThrow(ctx);
    requireActiveUser(viewer);
    return await ctx.storage.generateUploadUrl();
  },
});

// Get patient intake by ID (for providers/admins)
export const getById = query({
  args: { intakeId: v.id("patientIntake") },
  returns: v.union(
    v.object({
      _id: v.id("patientIntake"),
      _creationTime: v.number(),
      userId: v.id("users"),
      firstName: v.string(),
      lastName: v.string(),
      dateOfBirth: v.string(),
      sexAtBirth: v.union(v.literal("male"), v.literal("female")),
      phone: v.string(),
      email: v.string(),
      preferredLanguage: v.union(v.literal("english"), v.literal("spanish")),
      weightLbs: v.optional(v.number()),
      heightFt: v.optional(v.number()),
      heightIn: v.optional(v.number()),
      avatarStorageId: v.optional(v.id("_storage")),
      street: v.optional(v.string()),
      aptSuiteUnit: v.optional(v.string()),
      city: v.optional(v.string()),
      state: v.optional(v.string()),
      zipCode: v.optional(v.string()),
      insuranceProvider: v.optional(v.string()),
      policyNumber: v.optional(v.string()),
      groupNumber: v.optional(v.string()),
      policyholderName: v.optional(v.string()),
      relationshipToPatient: v.optional(v.string()),
      coverageEffectiveDate: v.optional(v.string()),
      insuranceCardFrontStorageId: v.optional(v.id("_storage")),
      insuranceCardBackStorageId: v.optional(v.id("_storage")),
      medicalConditions: v.optional(v.array(medicalConditionValidator)),
      medications: v.optional(v.array(medicationValidator)),
      allergies: v.optional(v.array(allergyValidator)),
      medicalHistorySkipped: v.optional(v.boolean()),
      telehealthConsentAccepted: v.optional(v.boolean()),
      telehealthConsentDate: v.optional(v.number()),
      hipaaConsentAccepted: v.optional(v.boolean()),
      hipaaConsentDate: v.optional(v.number()),
      intakeCompleted: v.boolean(),
      intakeStep: v.number(),
      cometChatUid: v.optional(v.string()),
      createdAt: v.number(),
      updatedAt: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const { user: viewer } = await getViewerOrThrow(ctx);
    requireActiveUser(viewer);
    requireRole(viewer, ["provider", "admin"]);

    return await ctx.db.get(args.intakeId);
  },
});

// List all patient intakes (for providers/admins)
export const listAll = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("patientIntake"),
      _creationTime: v.number(),
      userId: v.id("users"),
      firstName: v.string(),
      lastName: v.string(),
      dateOfBirth: v.string(),
      sexAtBirth: v.union(v.literal("male"), v.literal("female")),
      phone: v.string(),
      email: v.string(),
      preferredLanguage: v.union(v.literal("english"), v.literal("spanish")),
      weightLbs: v.optional(v.number()),
      heightFt: v.optional(v.number()),
      heightIn: v.optional(v.number()),
      avatarStorageId: v.optional(v.id("_storage")),
      street: v.optional(v.string()),
      aptSuiteUnit: v.optional(v.string()),
      city: v.optional(v.string()),
      state: v.optional(v.string()),
      zipCode: v.optional(v.string()),
      insuranceProvider: v.optional(v.string()),
      policyNumber: v.optional(v.string()),
      groupNumber: v.optional(v.string()),
      policyholderName: v.optional(v.string()),
      relationshipToPatient: v.optional(v.string()),
      coverageEffectiveDate: v.optional(v.string()),
      insuranceCardFrontStorageId: v.optional(v.id("_storage")),
      insuranceCardBackStorageId: v.optional(v.id("_storage")),
      medicalConditions: v.optional(v.array(medicalConditionValidator)),
      medications: v.optional(v.array(medicationValidator)),
      allergies: v.optional(v.array(allergyValidator)),
      medicalHistorySkipped: v.optional(v.boolean()),
      telehealthConsentAccepted: v.optional(v.boolean()),
      telehealthConsentDate: v.optional(v.number()),
      hipaaConsentAccepted: v.optional(v.boolean()),
      hipaaConsentDate: v.optional(v.number()),
      intakeCompleted: v.boolean(),
      intakeStep: v.number(),
      cometChatUid: v.optional(v.string()),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
  ),
  handler: async (ctx) => {
    const { user: viewer } = await getViewerOrThrow(ctx);
    requireActiveUser(viewer);
    requireRole(viewer, ["provider", "admin"]);

    return await ctx.db.query("patientIntake").collect();
  },
});

// Get intake by user ID (for providers/admins)
export const getByUserId = query({
  args: { userId: v.id("users") },
  returns: v.union(
    v.object({
      _id: v.id("patientIntake"),
      _creationTime: v.number(),
      userId: v.id("users"),
      firstName: v.string(),
      lastName: v.string(),
      dateOfBirth: v.string(),
      sexAtBirth: v.union(v.literal("male"), v.literal("female")),
      phone: v.string(),
      email: v.string(),
      preferredLanguage: v.union(v.literal("english"), v.literal("spanish")),
      weightLbs: v.optional(v.number()),
      heightFt: v.optional(v.number()),
      heightIn: v.optional(v.number()),
      avatarStorageId: v.optional(v.id("_storage")),
      street: v.optional(v.string()),
      aptSuiteUnit: v.optional(v.string()),
      city: v.optional(v.string()),
      state: v.optional(v.string()),
      zipCode: v.optional(v.string()),
      insuranceProvider: v.optional(v.string()),
      policyNumber: v.optional(v.string()),
      groupNumber: v.optional(v.string()),
      policyholderName: v.optional(v.string()),
      relationshipToPatient: v.optional(v.string()),
      coverageEffectiveDate: v.optional(v.string()),
      insuranceCardFrontStorageId: v.optional(v.id("_storage")),
      insuranceCardBackStorageId: v.optional(v.id("_storage")),
      medicalConditions: v.optional(v.array(medicalConditionValidator)),
      medications: v.optional(v.array(medicationValidator)),
      allergies: v.optional(v.array(allergyValidator)),
      medicalHistorySkipped: v.optional(v.boolean()),
      telehealthConsentAccepted: v.optional(v.boolean()),
      telehealthConsentDate: v.optional(v.number()),
      hipaaConsentAccepted: v.optional(v.boolean()),
      hipaaConsentDate: v.optional(v.number()),
      intakeCompleted: v.boolean(),
      intakeStep: v.number(),
      cometChatUid: v.optional(v.string()),
      createdAt: v.number(),
      updatedAt: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const { user: viewer } = await getViewerOrThrow(ctx);
    requireActiveUser(viewer);
    requireRole(viewer, ["provider", "admin"]);

    return await ctx.db
      .query("patientIntake")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique();
  },
});
