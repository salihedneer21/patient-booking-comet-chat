import { useState, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../../convex/_generated/dataModel";
import { SectionCard } from "../SectionCard";
import { StepNavigation } from "../StepNavigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import toast from "react-hot-toast";

const INSURANCE_PROVIDERS = [
  "Aetna",
  "Anthem",
  "Blue Cross Blue Shield",
  "Cigna",
  "Humana",
  "Kaiser Permanente",
  "Medicare",
  "Medicaid",
  "United Healthcare",
  "Other",
];

const RELATIONSHIPS = [
  { value: "self", label: "Self" },
  { value: "spouse", label: "Spouse" },
  { value: "child", label: "Child" },
  { value: "other", label: "Other" },
];

interface InsuranceData {
  insuranceProvider?: string;
  policyNumber?: string;
  groupNumber?: string;
  policyholderName?: string;
  relationshipToPatient?: string;
  coverageEffectiveDate?: string;
}

interface InsuranceStepProps {
  intakeId: Id<"patientIntake">;
  initialData: InsuranceData;
  onBack: () => void;
  onNext: () => void;
}

export function InsuranceStep({
  intakeId,
  initialData,
  onBack,
  onNext,
}: InsuranceStepProps) {
  const [data, setData] = useState<InsuranceData>(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const updateInsurance = useMutation(api.modules.telehealth.patientIntake.updateInsurance);

  useEffect(() => {
    setData(initialData);
  }, [initialData]);

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      await updateInsurance({
        intakeId,
        insuranceProvider: data.insuranceProvider?.trim(),
        policyNumber: data.policyNumber?.trim(),
        groupNumber: data.groupNumber?.trim(),
        policyholderName: data.policyholderName?.trim(),
        relationshipToPatient: data.relationshipToPatient,
        coverageEffectiveDate: data.coverageEffectiveDate,
      });
      onNext();
    } catch (error) {
      toast.error("Failed to save insurance information");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Insurance Information</h1>
        <p className="text-muted-foreground">
          Add your insurance details (optional)
        </p>
      </div>

      <SectionCard
        title="Insurance Provider"
        description="You can skip this step and add insurance later"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="insuranceProvider">Insurance Provider</Label>
            <Select
              value={data.insuranceProvider || ""}
              onValueChange={(value) =>
                setData({ ...data, insuranceProvider: value })
              }
            >
              <SelectTrigger id="insuranceProvider">
                <SelectValue placeholder="Select provider" />
              </SelectTrigger>
              <SelectContent>
                {INSURANCE_PROVIDERS.map((provider) => (
                  <SelectItem key={provider} value={provider}>
                    {provider}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="policyNumber">Policy Number</Label>
            <Input
              id="policyNumber"
              value={data.policyNumber || ""}
              onChange={(e) => setData({ ...data, policyNumber: e.target.value })}
              placeholder="Enter policy number"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="groupNumber">Group Number</Label>
            <Input
              id="groupNumber"
              value={data.groupNumber || ""}
              onChange={(e) => setData({ ...data, groupNumber: e.target.value })}
              placeholder="Enter group number"
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Policyholder Information">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="policyholderName">Policyholder Name</Label>
            <Input
              id="policyholderName"
              value={data.policyholderName || ""}
              onChange={(e) =>
                setData({ ...data, policyholderName: e.target.value })
              }
              placeholder="Enter policyholder name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="relationshipToPatient">Relationship to Patient</Label>
            <Select
              value={data.relationshipToPatient || ""}
              onValueChange={(value) =>
                setData({ ...data, relationshipToPatient: value })
              }
            >
              <SelectTrigger id="relationshipToPatient">
                <SelectValue placeholder="Select relationship" />
              </SelectTrigger>
              <SelectContent>
                {RELATIONSHIPS.map((rel) => (
                  <SelectItem key={rel.value} value={rel.value}>
                    {rel.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="coverageEffectiveDate">Coverage Effective Date</Label>
            <Input
              id="coverageEffectiveDate"
              type="date"
              value={data.coverageEffectiveDate || ""}
              onChange={(e) =>
                setData({ ...data, coverageEffectiveDate: e.target.value })
              }
            />
          </div>
        </div>
      </SectionCard>

      <StepNavigation
        currentStep={3}
        totalSteps={6}
        onBack={onBack}
        onNext={handleSubmit}
        isLoading={isLoading}
        nextLabel="Continue (Skip if needed)"
      />
    </div>
  );
}
