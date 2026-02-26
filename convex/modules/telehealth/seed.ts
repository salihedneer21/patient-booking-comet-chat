import { internalMutation } from "../../_generated/server";
import { v } from "convex/values";

/**
 * Seed data for telehealth module.
 * Run with: npx convex run modules/telehealth/seed:seedDemoData
 *
 * This creates demo data including:
 * - Demo provider profile with availability
 * - Sample appointments
 * - Sample medical records
 */
export const seedDemoData = internalMutation({
  args: {
    providerUserId: v.id("users"),
    providerEmail: v.string(),
    patientIntakeId: v.optional(v.id("patientIntake")),
    patientUserId: v.optional(v.id("users")),
  },
  returns: v.object({
    providerProfileId: v.id("providerProfiles"),
    availabilityCount: v.number(),
    appointmentsCount: v.number(),
  }),
  handler: async (ctx, args) => {
    const { providerUserId, providerEmail, patientIntakeId, patientUserId } = args;
    const now = Date.now();

    // Create provider profile
    const providerProfileId = await ctx.db.insert("providerProfiles", {
      userId: providerUserId,
      firstName: "Sarah",
      lastName: "Johnson",
      email: providerEmail,
      phone: "(555) 123-4567",
      licenseNumbers: [
        { number: "MD12345", state: "CA" },
        { number: "MD67890", state: "NY" },
      ],
      boardCertifications: ["American Board of Family Medicine"],
      education: ["MD, Stanford University School of Medicine"],
      languagesSpoken: ["English", "Spanish"],
      yearsOfExperience: 10,
      bio: "Dr. Sarah Johnson is a board-certified family medicine physician with over 10 years of experience in primary care and telehealth. She is passionate about preventive medicine and building long-term relationships with her patients.",
      servicesOffered: ["Primary Care", "Preventive Medicine", "Chronic Disease Management"],
      createdAt: now,
      updatedAt: now,
    });

    // Create availability (Mon-Fri 9am-5pm)
    const daysOfWeek = [1, 2, 3, 4, 5]; // Monday through Friday
    for (const dayOfWeek of daysOfWeek) {
      await ctx.db.insert("providerAvailability", {
        providerId: providerUserId,
        dayOfWeek,
        startTime: "09:00",
        endTime: "17:00",
        timezone: "America/Los_Angeles",
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });
    }

    let appointmentsCount = 0;

    // If patient IDs are provided, create sample appointments
    if (patientUserId) {
      const oneDay = 24 * 60 * 60 * 1000;
      const oneHour = 60 * 60 * 1000;

      // Create sample appointments
      const appointments = [
        {
          scheduledAt: now + oneDay + 10 * oneHour, // Tomorrow 10am
          status: "upcoming" as const,
          reasonForVisit: "Annual physical examination",
          durationMinutes: 30,
        },
        {
          scheduledAt: now + 3 * oneDay + 14 * oneHour, // 3 days, 2pm
          status: "unconfirmed" as const,
          reasonForVisit: "Follow-up: Blood pressure monitoring",
          durationMinutes: 15,
        },
        {
          scheduledAt: now - 7 * oneDay + 11 * oneHour, // Last week
          status: "completed" as const,
          reasonForVisit: "Headache and fatigue",
          durationMinutes: 30,
        },
      ];

      for (const apt of appointments) {
        const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await ctx.db.insert("appointments", {
          patientId: patientUserId,
          providerId: providerUserId,
          scheduledAt: apt.scheduledAt,
          durationMinutes: apt.durationMinutes,
          status: apt.status,
          reasonForVisit: apt.reasonForVisit,
          timezone: "America/Los_Angeles",
          cometChatSessionId: sessionId,
          sessionLink: `/call/${sessionId}`,
          createdAt: now,
          updatedAt: now,
        });
        appointmentsCount++;
      }

      // If patientIntakeId is provided, create medical records
      if (patientIntakeId) {
        // Create a completed encounter for the past appointment
        const encounterId = await ctx.db.insert("encounters", {
          patientId: patientIntakeId,
          providerId: providerUserId,
          encounterDate: new Date(now - 7 * oneDay).toISOString().split("T")[0],
          startedAt: now - 7 * oneDay + 11 * oneHour,
          finalizedAt: now - 7 * oneDay + 12 * oneHour,
          status: "finalized",
          chiefComplaint: "Patient presents with persistent headaches and fatigue for the past two weeks.",
          createdAt: now,
          updatedAt: now,
        });

        // Create SOAP note for the encounter
        await ctx.db.insert("soapNotes", {
          encounterId,
          subjective: "Patient reports frontal headaches occurring 3-4 times per week, rated 5-6/10 in severity. Associated with fatigue and difficulty concentrating. Onset approximately 2 weeks ago, coinciding with increased work stress. No visual changes, nausea, or vomiting. OTC acetaminophen provides partial relief.",
          objective: "Vitals: BP 118/76, HR 72, Temp 98.4°F. Alert and oriented x3. No papilledema on fundoscopic exam. Neck supple without rigidity. Mild pallor noted on conjunctival examination. Neurological exam within normal limits.",
          assessment: "1. Tension-type headache - likely stress-related given timing and presentation\n2. Fatigue - differential includes anemia, thyroid dysfunction, sleep disturbance\n3. Labs ordered: CBC, TSH, iron studies",
          plan: "1. Begin iron supplementation pending lab confirmation\n2. Sleep hygiene counseling provided\n3. Stress reduction techniques discussed\n4. PRN ibuprofen for headache relief\n5. Follow up in 4 weeks for lab review",
          createdAt: now,
          updatedAt: now,
        });

        // Add sample medical history
        await ctx.db.insert("medicalConditions", {
          patientId: patientIntakeId,
          conditionName: "Seasonal allergies",
          dateOfOnset: "2018-03-01",
          status: "active",
          severity: "mild",
          notes: "Worse in spring, controlled with OTC antihistamines",
          createdAt: now,
          updatedAt: now,
        });

        await ctx.db.insert("medications", {
          patientId: patientIntakeId,
          medicationName: "Cetirizine",
          dosage: "10mg",
          frequency: "Once daily as needed",
          startDate: "2018-03-01",
          status: "active",
          createdAt: now,
          updatedAt: now,
        });

        await ctx.db.insert("allergies", {
          patientId: patientIntakeId,
          allergenName: "Penicillin",
          allergenType: "medication",
          reactionType: "Hives, skin rash",
          severity: "moderate",
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    return {
      providerProfileId,
      availabilityCount: daysOfWeek.length,
      appointmentsCount,
    };
  },
});

/**
 * Create a sample patient intake record.
 * Run with: npx convex run modules/telehealth/seed:seedPatientIntake
 */
export const seedPatientIntake = internalMutation({
  args: {
    userId: v.id("users"),
    email: v.string(),
  },
  returns: v.id("patientIntake"),
  handler: async (ctx, args) => {
    const { userId, email } = args;
    const now = Date.now();

    // Check if intake already exists
    const existing = await ctx.db
      .query("patientIntake")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();

    if (existing) {
      return existing._id;
    }

    const intakeId = await ctx.db.insert("patientIntake", {
      userId,
      email,
      intakeStep: 6,
      intakeCompleted: true,
      firstName: "John",
      lastName: "Doe",
      dateOfBirth: "1985-03-15",
      sexAtBirth: "male",
      phone: "(555) 987-6543",
      preferredLanguage: "english",
      weightLbs: 175,
      heightFt: 5,
      heightIn: 10,
      street: "123 Main Street",
      aptSuiteUnit: "Apt 4B",
      city: "San Francisco",
      state: "CA",
      zipCode: "94102",
      insuranceProvider: "Blue Cross Blue Shield",
      policyNumber: "ABC123456789",
      groupNumber: "GRP789",
      policyholderName: "John Doe",
      relationshipToPatient: "self",
      coverageEffectiveDate: "2023-01-01",
      medicalConditions: [
        { name: "Hypertension", onsetDate: "2020-01-01", status: "managed", severity: "moderate" },
      ],
      medications: [
        { name: "Lisinopril", dosage: "10mg", frequency: "daily", startDate: "2020-01-15" },
      ],
      allergies: [
        { allergen: "Shellfish", reaction: "Hives", severity: "mild" },
      ],
      medicalHistorySkipped: false,
      telehealthConsentAccepted: true,
      telehealthConsentDate: now,
      hipaaConsentAccepted: true,
      hipaaConsentDate: now,
      createdAt: now,
      updatedAt: now,
    });

    return intakeId;
  },
});

/**
 * Clear all telehealth demo data.
 * WARNING: This will delete all telehealth-related records!
 * Run with: npx convex run modules/telehealth/seed:clearAllData
 */
export const clearAllData = internalMutation({
  args: {},
  returns: v.object({
    deletedCounts: v.record(v.string(), v.number()),
  }),
  handler: async (ctx) => {
    const tables = [
      "patientIntake",
      "providerProfiles",
      "providerAvailability",
      "appointments",
      "encounters",
      "soapNotes",
      "encounterAddendums",
      "medicalConditions",
      "medications",
      "allergies",
      "notifications",
      "cometChatUsers",
    ] as const;

    const deletedCounts: Record<string, number> = {};

    for (const table of tables) {
      const records = await ctx.db.query(table).collect();
      for (const record of records) {
        await ctx.db.delete(record._id);
      }
      deletedCounts[table] = records.length;
    }

    return { deletedCounts };
  },
});
