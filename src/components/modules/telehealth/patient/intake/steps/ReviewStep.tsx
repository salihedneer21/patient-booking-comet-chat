import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../../convex/_generated/dataModel";
import { SectionCard } from "../SectionCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Edit2, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

type MedicalCondition = {
  name: string;
  onsetDate?: string;
  status?: "active" | "resolved" | "managed";
  severity?: "mild" | "moderate" | "severe";
};

type Medication = {
  name: string;
  dosage?: string;
  frequency?: "daily" | "twice_daily" | "weekly" | "as_needed";
  startDate?: string;
};

type Allergy = {
  allergen: string;
  reaction?: string;
  severity: "mild" | "moderate" | "severe" | "life_threatening";
};

interface IntakeData {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  sexAtBirth: "male" | "female";
  phone: string;
  email: string;
  preferredLanguage: "english" | "spanish";
  weightLbs?: number;
  heightFt?: number;
  heightIn?: number;
  street?: string;
  aptSuiteUnit?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  insuranceProvider?: string;
  policyNumber?: string;
  groupNumber?: string;
  policyholderName?: string;
  relationshipToPatient?: string;
  coverageEffectiveDate?: string;
  medicalConditions?: MedicalCondition[];
  medications?: Medication[];
  allergies?: Allergy[];
  medicalHistorySkipped?: boolean;
  telehealthConsentAccepted?: boolean;
  hipaaConsentAccepted?: boolean;
}

interface ReviewStepProps {
  intakeId: Id<"patientIntake">;
  data: IntakeData;
  onBack: () => void;
  onComplete: () => void;
  onEditStep: (step: number) => void;
}

export function ReviewStep({
  intakeId,
  data,
  onBack,
  onComplete,
  onEditStep,
}: ReviewStepProps) {
  const [isLoading, setIsLoading] = useState(false);
  const completeIntake = useMutation(api.modules.telehealth.patientIntake.completeIntake);

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      await completeIntake({ intakeId });
      toast.success("Registration complete! Welcome to the platform.");
      onComplete();
    } catch (error) {
      toast.error("Failed to complete registration");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "Not provided";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatHeight = () => {
    if (data.heightFt === undefined) return "Not provided";
    return `${data.heightFt}'${data.heightIn || 0}"`;
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "mild":
        return "bg-green-100 text-green-800";
      case "moderate":
        return "bg-yellow-100 text-yellow-800";
      case "severe":
        return "bg-orange-100 text-orange-800";
      case "life_threatening":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Review & Submit</h1>
        <p className="text-muted-foreground">
          Please review your information before completing registration
        </p>
      </div>

      {/* Personal Information */}
      <SectionCard title="Personal Information">
        <div className="flex justify-between items-start">
          <div className="grid gap-4 sm:grid-cols-2 flex-1">
            <div>
              <p className="text-sm text-muted-foreground">Full Name</p>
              <p className="font-medium">{data.firstName} {data.lastName}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Date of Birth</p>
              <p className="font-medium">{formatDate(data.dateOfBirth)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Sex at Birth</p>
              <p className="font-medium capitalize">{data.sexAtBirth}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Phone</p>
              <p className="font-medium">{data.phone}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-medium">{data.email}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Preferred Language</p>
              <p className="font-medium capitalize">{data.preferredLanguage}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Weight</p>
              <p className="font-medium">{data.weightLbs ? `${data.weightLbs} lbs` : "Not provided"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Height</p>
              <p className="font-medium">{formatHeight()}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => onEditStep(1)}>
            <Edit2 className="w-4 h-4" />
          </Button>
        </div>
      </SectionCard>

      {/* Address */}
      <SectionCard title="Address">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <p className="font-medium">
              {data.street}
              {data.aptSuiteUnit && `, ${data.aptSuiteUnit}`}
            </p>
            <p className="text-muted-foreground">
              {data.city}, {data.state} {data.zipCode}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => onEditStep(2)}>
            <Edit2 className="w-4 h-4" />
          </Button>
        </div>
      </SectionCard>

      {/* Insurance */}
      <SectionCard title="Insurance Information">
        <div className="flex justify-between items-start">
          <div className="grid gap-4 sm:grid-cols-2 flex-1">
            {data.insuranceProvider ? (
              <>
                <div>
                  <p className="text-sm text-muted-foreground">Insurance Provider</p>
                  <p className="font-medium">{data.insuranceProvider}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Policy Number</p>
                  <p className="font-medium">{data.policyNumber || "Not provided"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Group Number</p>
                  <p className="font-medium">{data.groupNumber || "Not provided"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Policyholder</p>
                  <p className="font-medium">{data.policyholderName || "Not provided"}</p>
                </div>
              </>
            ) : (
              <p className="text-muted-foreground col-span-2">No insurance information provided</p>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={() => onEditStep(3)}>
            <Edit2 className="w-4 h-4" />
          </Button>
        </div>
      </SectionCard>

      {/* Medical History */}
      <SectionCard title="Medical History">
        <div className="flex justify-between items-start">
          <div className="flex-1 space-y-4">
            {data.medicalHistorySkipped ? (
              <p className="text-muted-foreground">Skipped - can be completed later</p>
            ) : (
              <>
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Medical Conditions</p>
                  {data.medicalConditions && data.medicalConditions.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {data.medicalConditions.map((condition, index) => (
                        <Badge key={index} variant="secondary">
                          {condition.name}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">None reported</p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Medications</p>
                  {data.medications && data.medications.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {data.medications.map((med, index) => (
                        <Badge key={index} variant="secondary">
                          {med.name}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">None reported</p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Allergies</p>
                  {data.allergies && data.allergies.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {data.allergies.map((allergy, index) => (
                        <Badge
                          key={index}
                          className={getSeverityColor(allergy.severity)}
                        >
                          {allergy.allergen}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">None reported</p>
                  )}
                </div>
              </>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={() => onEditStep(4)}>
            <Edit2 className="w-4 h-4" />
          </Button>
        </div>
      </SectionCard>

      {/* Consents */}
      <SectionCard title="Consent & Authorization">
        <div className="flex justify-between items-start">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                <Check className="w-3 h-3 text-white" />
              </div>
              <p className="text-sm">Telehealth Informed Consent accepted</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                <Check className="w-3 h-3 text-white" />
              </div>
              <p className="text-sm">HIPAA Authorization accepted</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => onEditStep(5)}>
            <Edit2 className="w-4 h-4" />
          </Button>
        </div>
      </SectionCard>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-6 mt-6 border-t">
        <Button type="button" variant="outline" onClick={onBack} disabled={isLoading}>
          Back
        </Button>
        <Button type="button" onClick={handleSubmit} disabled={isLoading} size="lg">
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Completing...
            </>
          ) : (
            <>
              <Check className="w-4 h-4 mr-2" />
              Complete Registration
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
