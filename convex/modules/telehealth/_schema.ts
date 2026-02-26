import { defineTable } from "convex/server";
import { v } from "convex/values";

// Type validators for embedded objects
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

const medicalHistorySourceValidator = v.union(
  v.literal("intake"),
  v.literal("provider"),
  v.literal("admin"),
);

const licenseNumberValidator = v.object({
  number: v.string(),
  state: v.string(),
});

export const telehealthTables = {
  // Patient intake/onboarding data
  patientIntake: defineTable({
    userId: v.id("users"),
    firstName: v.string(),
    lastName: v.string(),
    dateOfBirth: v.string(), // YYYY-MM-DD
    sexAtBirth: v.union(v.literal("male"), v.literal("female")),
    phone: v.string(),
    email: v.string(),
    preferredLanguage: v.union(v.literal("english"), v.literal("spanish")),
    weightLbs: v.optional(v.number()),
    heightFt: v.optional(v.number()),
    heightIn: v.optional(v.number()),
    avatarStorageId: v.optional(v.id("_storage")),
    // Address
    street: v.optional(v.string()),
    aptSuiteUnit: v.optional(v.string()),
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    zipCode: v.optional(v.string()),
    // Insurance
    insuranceProvider: v.optional(v.string()),
    policyNumber: v.optional(v.string()),
    groupNumber: v.optional(v.string()),
    policyholderName: v.optional(v.string()),
    relationshipToPatient: v.optional(v.string()),
    coverageEffectiveDate: v.optional(v.string()),
    insuranceCardFrontStorageId: v.optional(v.id("_storage")),
    insuranceCardBackStorageId: v.optional(v.id("_storage")),
    // Medical history (embedded arrays)
    medicalConditions: v.optional(v.array(medicalConditionValidator)),
    medications: v.optional(v.array(medicationValidator)),
    allergies: v.optional(v.array(allergyValidator)),
    medicalHistorySkipped: v.optional(v.boolean()),
    // Consent
    telehealthConsentAccepted: v.optional(v.boolean()),
    telehealthConsentDate: v.optional(v.number()),
    hipaaConsentAccepted: v.optional(v.boolean()),
    hipaaConsentDate: v.optional(v.number()),
    // Progress
    intakeCompleted: v.boolean(),
    intakeStep: v.number(), // 1-6
    // CometChat
    cometChatUid: v.optional(v.string()),
    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_intakeCompleted", ["intakeCompleted"])
    .index("by_cometChatUid", ["cometChatUid"]),

  // Provider profiles
  providerProfiles: defineTable({
    userId: v.id("users"),
    firstName: v.string(),
    lastName: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    avatarStorageId: v.optional(v.id("_storage")),
    // Professional info
    licenseNumbers: v.optional(v.array(licenseNumberValidator)),
    boardCertifications: v.optional(v.array(v.string())),
    education: v.optional(v.array(v.string())),
    languagesSpoken: v.optional(v.array(v.string())),
    professionalAssociations: v.optional(v.array(v.string())),
    yearsOfExperience: v.optional(v.number()),
    bio: v.optional(v.string()),
    // Practice details
    practiceStreet: v.optional(v.string()),
    practiceCity: v.optional(v.string()),
    practiceState: v.optional(v.string()),
    practiceZip: v.optional(v.string()),
    servicesOffered: v.optional(v.array(v.string())),
    insurancePlansAccepted: v.optional(v.array(v.string())),
    hospitalAffiliations: v.optional(v.array(v.string())),
    // CometChat
    cometChatUid: v.optional(v.string()),
    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_cometChatUid", ["cometChatUid"]),

  // Provider availability
  providerAvailability: defineTable({
    providerId: v.id("users"),
    dayOfWeek: v.number(), // 0-6 (Sunday=0)
    startTime: v.string(), // HH:MM
    endTime: v.string(), // HH:MM
    timezone: v.string(), // IANA timezone
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_providerId", ["providerId"])
    .index("by_providerId_and_dayOfWeek", ["providerId", "dayOfWeek"]),

  // Appointments
  appointments: defineTable({
    patientId: v.id("users"),
    providerId: v.id("users"),
    scheduledAt: v.number(), // Unix timestamp UTC
    durationMinutes: v.number(),
    timezone: v.string(), // Patient's selected timezone
    status: v.union(
      v.literal("upcoming"),
      v.literal("unconfirmed"),
      v.literal("completed"),
      v.literal("canceled"),
      v.literal("rescheduled")
    ),
    reasonForVisit: v.string(),
    cometChatSessionId: v.string(), // UUID for video call
    sessionLink: v.string(), // Full URL to /call/:sessionId
    patientJoinedAt: v.optional(v.number()),
    providerJoinedAt: v.optional(v.number()),
    endedAt: v.optional(v.number()),
    canceledBy: v.optional(v.id("users")),
    cancelReason: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_patientId", ["patientId"])
    .index("by_providerId", ["providerId"])
    .index("by_status", ["status"])
    .index("by_scheduledAt", ["scheduledAt"])
    .index("by_cometChatSessionId", ["cometChatSessionId"])
    .index("by_patientId_and_status", ["patientId", "status"])
    .index("by_patientId_and_providerId", ["patientId", "providerId"])
    .index("by_providerId_and_status", ["providerId", "status"])
    .index("by_providerId_and_patientId", ["providerId", "patientId"])
    .index("by_providerId_and_scheduledAt", ["providerId", "scheduledAt"]),

  // Encounters
  encounters: defineTable({
    patientId: v.id("patientIntake"),
    providerId: v.id("users"),
    appointmentId: v.optional(v.id("appointments")),
    encounterDate: v.string(),
    startedAt: v.number(),
    finalizedAt: v.optional(v.number()),
    status: v.union(v.literal("draft"), v.literal("finalized")),
    chiefComplaint: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_patientId", ["patientId"])
    .index("by_providerId", ["providerId"])
    .index("by_status", ["status"])
    .index("by_encounterDate", ["encounterDate"])
    .index("by_appointmentId", ["appointmentId"]),

  // SOAP Notes
  soapNotes: defineTable({
    encounterId: v.id("encounters"),
    subjective: v.optional(v.string()),
    objective: v.optional(v.string()),
    assessment: v.optional(v.string()),
    plan: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_encounterId", ["encounterId"]),

  // Encounter Addendums
  encounterAddendums: defineTable({
    encounterId: v.id("encounters"),
    authorId: v.id("users"),
    content: v.string(),
    createdAt: v.number(),
  })
    .index("by_encounterId", ["encounterId"]),

  // Medical Conditions (separate table for complex queries)
  medicalConditions: defineTable({
    patientId: v.id("patientIntake"),
    conditionName: v.string(),
    icdCode: v.optional(v.string()),
    dateOfOnset: v.optional(v.string()),
    status: v.union(v.literal("active"), v.literal("resolved"), v.literal("chronic")),
    severity: v.optional(v.union(v.literal("mild"), v.literal("moderate"), v.literal("severe"))),
    notes: v.optional(v.string()),
    source: v.optional(medicalHistorySourceValidator),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_patientId", ["patientId"])
    .index("by_status", ["status"])
    .index("by_patientId_and_status", ["patientId", "status"])
    .index("by_patientId_and_source", ["patientId", "source"]),

  // Medications
  medications: defineTable({
    patientId: v.id("patientIntake"),
    medicationName: v.string(),
    rxNormCode: v.optional(v.string()),
    startDate: v.string(),
    endDate: v.optional(v.string()),
    status: v.union(v.literal("active"), v.literal("discontinued"), v.literal("completed")),
    dosage: v.string(),
    frequency: v.string(),
    source: v.optional(medicalHistorySourceValidator),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_patientId", ["patientId"])
    .index("by_status", ["status"])
    .index("by_patientId_and_status", ["patientId", "status"])
    .index("by_patientId_and_source", ["patientId", "source"]),

  // Allergies
  allergies: defineTable({
    patientId: v.id("patientIntake"),
    allergenName: v.string(),
    allergenType: v.union(
      v.literal("medication"),
      v.literal("food"),
      v.literal("environmental"),
      v.literal("other")
    ),
    reactionType: v.string(),
    severity: v.union(
      v.literal("mild"),
      v.literal("moderate"),
      v.literal("severe"),
      v.literal("life_threatening")
    ),
    notes: v.optional(v.string()),
    source: v.optional(medicalHistorySourceValidator),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_patientId", ["patientId"])
    .index("by_severity", ["severity"])
    .index("by_patientId_and_severity", ["patientId", "severity"])
    .index("by_patientId_and_source", ["patientId", "source"]),

  // Notifications
  notifications: defineTable({
    userId: v.id("users"),
    title: v.string(),
    body: v.string(),
    type: v.union(
      v.literal("appointment"),
      v.literal("message"),
      v.literal("encounter"),
      v.literal("system")
    ),
    isRead: v.boolean(),
    actionUrl: v.optional(v.string()),
    metadata: v.optional(v.any()),
    createdAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_isRead", ["isRead"])
    .index("by_type", ["type"])
    .index("by_userId_and_isRead", ["userId", "isRead"]),

  // CometChat Users mapping
  cometChatUsers: defineTable({
    userId: v.id("users"),
    cometChatUid: v.string(),
    role: v.union(v.literal("patient"), v.literal("provider"), v.literal("admin")),
    createdAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_cometChatUid", ["cometChatUid"]),
};
