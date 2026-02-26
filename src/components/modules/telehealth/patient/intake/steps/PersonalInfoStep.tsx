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

interface PersonalInfoData {
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
}

interface PersonalInfoStepProps {
  intakeId: Id<"patientIntake">;
  initialData: PersonalInfoData;
  onBack: () => void;
  onNext: () => void;
}

export function PersonalInfoStep({
  intakeId,
  initialData,
  onBack,
  onNext,
}: PersonalInfoStepProps) {
  const [data, setData] = useState<PersonalInfoData>(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const updatePersonalInfo = useMutation(api.modules.telehealth.patientIntake.updatePersonalInfo);

  useEffect(() => {
    setData(initialData);
  }, [initialData]);

  const formatPhoneNumber = (value: string) => {
    const numbers = value.replace(/\D/g, "").slice(0, 10);
    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 6) return `(${numbers.slice(0, 3)}) ${numbers.slice(3)}`;
    return `(${numbers.slice(0, 3)}) ${numbers.slice(3, 6)}-${numbers.slice(6)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setData({ ...data, phone: formatted });
  };

  const handleSubmit = async () => {
    // Validation
    if (!data.firstName.trim()) {
      toast.error("First name is required");
      return;
    }
    if (!data.lastName.trim()) {
      toast.error("Last name is required");
      return;
    }
    if (!data.dateOfBirth) {
      toast.error("Date of birth is required");
      return;
    }
    if (!data.phone || data.phone.replace(/\D/g, "").length !== 10) {
      toast.error("Valid phone number is required");
      return;
    }

    setIsLoading(true);
    try {
      await updatePersonalInfo({
        intakeId,
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        dateOfBirth: data.dateOfBirth,
        sexAtBirth: data.sexAtBirth,
        phone: data.phone,
        preferredLanguage: data.preferredLanguage,
        weightLbs: data.weightLbs,
        heightFt: data.heightFt,
        heightIn: data.heightIn,
      });
      onNext();
    } catch (error) {
      toast.error("Failed to save personal information");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Personal Information</h1>
        <p className="text-muted-foreground">Tell us about yourself</p>
      </div>

      <SectionCard title="Basic Information">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="firstName">First Name *</Label>
            <Input
              id="firstName"
              value={data.firstName}
              onChange={(e) => setData({ ...data, firstName: e.target.value })}
              placeholder="John"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">Last Name *</Label>
            <Input
              id="lastName"
              value={data.lastName}
              onChange={(e) => setData({ ...data, lastName: e.target.value })}
              placeholder="Doe"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dateOfBirth">Date of Birth *</Label>
            <Input
              id="dateOfBirth"
              type="date"
              value={data.dateOfBirth}
              onChange={(e) => setData({ ...data, dateOfBirth: e.target.value })}
              max={new Date().toISOString().split("T")[0]}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sexAtBirth">Sex at Birth *</Label>
            <Select
              value={data.sexAtBirth}
              onValueChange={(value: "male" | "female") =>
                setData({ ...data, sexAtBirth: value })
              }
            >
              <SelectTrigger id="sexAtBirth">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Physical Information" description="Optional">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="weightLbs">Weight (lbs)</Label>
            <Input
              id="weightLbs"
              type="number"
              value={data.weightLbs || ""}
              onChange={(e) =>
                setData({ ...data, weightLbs: e.target.value ? Number(e.target.value) : undefined })
              }
              placeholder="150"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="heightFt">Height (ft)</Label>
            <Input
              id="heightFt"
              type="number"
              value={data.heightFt || ""}
              onChange={(e) =>
                setData({ ...data, heightFt: e.target.value ? Number(e.target.value) : undefined })
              }
              placeholder="5"
              min={0}
              max={8}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="heightIn">Height (in)</Label>
            <Input
              id="heightIn"
              type="number"
              value={data.heightIn || ""}
              onChange={(e) =>
                setData({ ...data, heightIn: e.target.value ? Number(e.target.value) : undefined })
              }
              placeholder="10"
              min={0}
              max={11}
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Contact Information">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={data.email}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">
              Email cannot be changed
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone *</Label>
            <Input
              id="phone"
              type="tel"
              value={data.phone}
              onChange={handlePhoneChange}
              placeholder="(555) 123-4567"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="preferredLanguage">Preferred Language *</Label>
            <Select
              value={data.preferredLanguage}
              onValueChange={(value: "english" | "spanish") =>
                setData({ ...data, preferredLanguage: value })
              }
            >
              <SelectTrigger id="preferredLanguage">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="english">English</SelectItem>
                <SelectItem value="spanish">Spanish</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </SectionCard>

      <StepNavigation
        currentStep={1}
        totalSteps={6}
        onBack={onBack}
        onNext={handleSubmit}
        isLoading={isLoading}
      />
    </div>
  );
}
