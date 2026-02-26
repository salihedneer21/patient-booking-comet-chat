import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";

type EmbeddedMedicalCondition = {
  name: string;
  onsetDate?: string;
  status?: "active" | "resolved" | "managed";
  severity?: "mild" | "moderate" | "severe";
};

type EmbeddedMedication = {
  name: string;
  dosage?: string;
  frequency?: "daily" | "twice_daily" | "weekly" | "as_needed";
  startDate?: string;
};

type EmbeddedAllergy = {
  allergen: string;
  reaction?: string;
  severity: "mild" | "moderate" | "severe" | "life_threatening";
};

type MedicalHistorySource = "intake" | "provider" | "admin";

function formatMedicationFrequency(frequency?: EmbeddedMedication["frequency"]): string {
  switch (frequency) {
    case "daily":
      return "Daily";
    case "twice_daily":
      return "Twice daily";
    case "weekly":
      return "Weekly";
    case "as_needed":
      return "As needed";
    default:
      return "As needed";
  }
}

function mapConditionStatus(
  status?: EmbeddedMedicalCondition["status"],
): "active" | "resolved" | "chronic" {
  if (status === "managed") return "chronic";
  if (status === "resolved") return "resolved";
  return "active";
}

export async function replaceIntakeSourcedMedicalHistory(
  ctx: Pick<MutationCtx, "db">,
  args: {
    patientIntakeId: Id<"patientIntake">;
    medicalConditions?: EmbeddedMedicalCondition[];
    medications?: EmbeddedMedication[];
    allergies?: EmbeddedAllergy[];
    skipped?: boolean;
    source?: MedicalHistorySource;
  },
) {
  const source: MedicalHistorySource = args.source ?? "intake";

  const [existingConditions, existingMedications, existingAllergies] = await Promise.all([
    ctx.db
      .query("medicalConditions")
      .withIndex("by_patientId_and_source", (q) =>
        q.eq("patientId", args.patientIntakeId).eq("source", source),
      )
      .collect(),
    ctx.db
      .query("medications")
      .withIndex("by_patientId_and_source", (q) =>
        q.eq("patientId", args.patientIntakeId).eq("source", source),
      )
      .collect(),
    ctx.db
      .query("allergies")
      .withIndex("by_patientId_and_source", (q) =>
        q.eq("patientId", args.patientIntakeId).eq("source", source),
      )
      .collect(),
  ]);

  await Promise.all([
    ...existingConditions.map((doc) => ctx.db.delete(doc._id)),
    ...existingMedications.map((doc) => ctx.db.delete(doc._id)),
    ...existingAllergies.map((doc) => ctx.db.delete(doc._id)),
  ]);

  if (args.skipped) {
    return;
  }

  const now = Date.now();

  const conditions = (args.medicalConditions ?? [])
    .map((c) => ({ ...c, name: c.name.trim() }))
    .filter((c) => c.name.length > 0);

  const medications = (args.medications ?? [])
    .map((m) => ({ ...m, name: m.name.trim() }))
    .filter((m) => m.name.length > 0);

  const allergies = (args.allergies ?? [])
    .map((a) => ({ ...a, allergen: a.allergen.trim() }))
    .filter((a) => a.allergen.length > 0);

  await Promise.all([
    ...conditions.map((condition) =>
      ctx.db.insert("medicalConditions", {
        patientId: args.patientIntakeId,
        conditionName: condition.name,
        dateOfOnset: condition.onsetDate,
        status: mapConditionStatus(condition.status),
        severity: condition.severity,
        source,
        createdAt: now,
        updatedAt: now,
      }),
    ),
    ...medications.map((medication) =>
      ctx.db.insert("medications", {
        patientId: args.patientIntakeId,
        medicationName: medication.name,
        startDate: medication.startDate ?? "Unknown",
        status: "active",
        dosage: medication.dosage?.trim() || "Unknown",
        frequency: formatMedicationFrequency(medication.frequency),
        source,
        createdAt: now,
        updatedAt: now,
      }),
    ),
    ...allergies.map((allergy) =>
      ctx.db.insert("allergies", {
        patientId: args.patientIntakeId,
        allergenName: allergy.allergen,
        allergenType: "other",
        reactionType: allergy.reaction?.trim() || "Unknown",
        severity: allergy.severity,
        source,
        createdAt: now,
        updatedAt: now,
      }),
    ),
  ]);
}

