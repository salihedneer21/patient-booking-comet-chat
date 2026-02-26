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

const US_STATES = [
  { value: "AL", label: "Alabama" },
  { value: "AK", label: "Alaska" },
  { value: "AZ", label: "Arizona" },
  { value: "AR", label: "Arkansas" },
  { value: "CA", label: "California" },
  { value: "CO", label: "Colorado" },
  { value: "CT", label: "Connecticut" },
  { value: "DE", label: "Delaware" },
  { value: "FL", label: "Florida" },
  { value: "GA", label: "Georgia" },
  { value: "HI", label: "Hawaii" },
  { value: "ID", label: "Idaho" },
  { value: "IL", label: "Illinois" },
  { value: "IN", label: "Indiana" },
  { value: "IA", label: "Iowa" },
  { value: "KS", label: "Kansas" },
  { value: "KY", label: "Kentucky" },
  { value: "LA", label: "Louisiana" },
  { value: "ME", label: "Maine" },
  { value: "MD", label: "Maryland" },
  { value: "MA", label: "Massachusetts" },
  { value: "MI", label: "Michigan" },
  { value: "MN", label: "Minnesota" },
  { value: "MS", label: "Mississippi" },
  { value: "MO", label: "Missouri" },
  { value: "MT", label: "Montana" },
  { value: "NE", label: "Nebraska" },
  { value: "NV", label: "Nevada" },
  { value: "NH", label: "New Hampshire" },
  { value: "NJ", label: "New Jersey" },
  { value: "NM", label: "New Mexico" },
  { value: "NY", label: "New York" },
  { value: "NC", label: "North Carolina" },
  { value: "ND", label: "North Dakota" },
  { value: "OH", label: "Ohio" },
  { value: "OK", label: "Oklahoma" },
  { value: "OR", label: "Oregon" },
  { value: "PA", label: "Pennsylvania" },
  { value: "RI", label: "Rhode Island" },
  { value: "SC", label: "South Carolina" },
  { value: "SD", label: "South Dakota" },
  { value: "TN", label: "Tennessee" },
  { value: "TX", label: "Texas" },
  { value: "UT", label: "Utah" },
  { value: "VT", label: "Vermont" },
  { value: "VA", label: "Virginia" },
  { value: "WA", label: "Washington" },
  { value: "WV", label: "West Virginia" },
  { value: "WI", label: "Wisconsin" },
  { value: "WY", label: "Wyoming" },
  { value: "DC", label: "District of Columbia" },
];

interface AddressData {
  street?: string;
  aptSuiteUnit?: string;
  city?: string;
  state?: string;
  zipCode?: string;
}

interface AddressStepProps {
  intakeId: Id<"patientIntake">;
  initialData: AddressData;
  onBack: () => void;
  onNext: () => void;
}

export function AddressStep({
  intakeId,
  initialData,
  onBack,
  onNext,
}: AddressStepProps) {
  const [data, setData] = useState<AddressData>(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const updateAddress = useMutation(api.modules.telehealth.patientIntake.updateAddress);

  useEffect(() => {
    setData(initialData);
  }, [initialData]);

  const handleSubmit = async () => {
    // Validation
    if (!data.street?.trim()) {
      toast.error("Street address is required");
      return;
    }
    if (!data.city?.trim()) {
      toast.error("City is required");
      return;
    }
    if (!data.state) {
      toast.error("State is required");
      return;
    }
    if (!data.zipCode || !/^\d{5}$/.test(data.zipCode)) {
      toast.error("Valid 5-digit ZIP code is required");
      return;
    }

    setIsLoading(true);
    try {
      await updateAddress({
        intakeId,
        street: data.street.trim(),
        aptSuiteUnit: data.aptSuiteUnit?.trim(),
        city: data.city.trim(),
        state: data.state,
        zipCode: data.zipCode,
      });
      onNext();
    } catch (error) {
      toast.error("Failed to save address");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Address</h1>
        <p className="text-muted-foreground">Where can we send you mail?</p>
      </div>

      <SectionCard title="Home Address">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="street">Street Address *</Label>
            <Input
              id="street"
              value={data.street || ""}
              onChange={(e) => setData({ ...data, street: e.target.value })}
              placeholder="123 Main Street"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="aptSuiteUnit">Apt / Suite / Unit</Label>
            <Input
              id="aptSuiteUnit"
              value={data.aptSuiteUnit || ""}
              onChange={(e) => setData({ ...data, aptSuiteUnit: e.target.value })}
              placeholder="Apt 4B"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="city">City *</Label>
              <Input
                id="city"
                value={data.city || ""}
                onChange={(e) => setData({ ...data, city: e.target.value })}
                placeholder="New York"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State *</Label>
              <Select
                value={data.state || ""}
                onValueChange={(value) => setData({ ...data, state: value })}
              >
                <SelectTrigger id="state">
                  <SelectValue placeholder="Select state" />
                </SelectTrigger>
                <SelectContent>
                  {US_STATES.map((state) => (
                    <SelectItem key={state.value} value={state.value}>
                      {state.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="zipCode">ZIP Code *</Label>
              <Input
                id="zipCode"
                value={data.zipCode || ""}
                onChange={(e) =>
                  setData({ ...data, zipCode: e.target.value.replace(/\D/g, "").slice(0, 5) })
                }
                placeholder="10001"
                maxLength={5}
              />
            </div>
          </div>
        </div>
      </SectionCard>

      <StepNavigation
        currentStep={2}
        totalSteps={6}
        onBack={onBack}
        onNext={handleSubmit}
        isLoading={isLoading}
      />
    </div>
  );
}
