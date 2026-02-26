import { useState, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../../convex/_generated/dataModel";
import { SectionCard } from "../SectionCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, X, AlertTriangle } from "lucide-react";
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

interface MedicalHistoryData {
  medicalConditions?: MedicalCondition[];
  medications?: Medication[];
  allergies?: Allergy[];
  medicalHistorySkipped?: boolean;
}

interface MedicalHistoryStepProps {
  intakeId: Id<"patientIntake">;
  initialData: MedicalHistoryData;
  onBack: () => void;
  onNext: () => void;
}

export function MedicalHistoryStep({
  intakeId,
  initialData,
  onBack,
  onNext,
}: MedicalHistoryStepProps) {
  const [data, setData] = useState<MedicalHistoryData>(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const [conditionDialog, setConditionDialog] = useState(false);
  const [medicationDialog, setMedicationDialog] = useState(false);
  const [allergyDialog, setAllergyDialog] = useState(false);
  const [newCondition, setNewCondition] = useState<MedicalCondition>({ name: "" });
  const [newMedication, setNewMedication] = useState<Medication>({ name: "" });
  const [newAllergy, setNewAllergy] = useState<Allergy>({ allergen: "", severity: "mild" });

  const updateMedicalHistory = useMutation(api.modules.telehealth.patientIntake.updateMedicalHistory);

  useEffect(() => {
    setData(initialData);
  }, [initialData]);

  const handleAddCondition = () => {
    if (!newCondition.name.trim()) {
      toast.error("Condition name is required");
      return;
    }
    setData({
      ...data,
      medicalConditions: [...(data.medicalConditions || []), newCondition],
    });
    setNewCondition({ name: "" });
    setConditionDialog(false);
  };

  const handleAddMedication = () => {
    if (!newMedication.name.trim()) {
      toast.error("Medication name is required");
      return;
    }
    setData({
      ...data,
      medications: [...(data.medications || []), newMedication],
    });
    setNewMedication({ name: "" });
    setMedicationDialog(false);
  };

  const handleAddAllergy = () => {
    if (!newAllergy.allergen.trim()) {
      toast.error("Allergen name is required");
      return;
    }
    setData({
      ...data,
      allergies: [...(data.allergies || []), newAllergy],
    });
    setNewAllergy({ allergen: "", severity: "mild" });
    setAllergyDialog(false);
  };

  const removeCondition = (index: number) => {
    setData({
      ...data,
      medicalConditions: data.medicalConditions?.filter((_, i) => i !== index),
    });
  };

  const removeMedication = (index: number) => {
    setData({
      ...data,
      medications: data.medications?.filter((_, i) => i !== index),
    });
  };

  const removeAllergy = (index: number) => {
    setData({
      ...data,
      allergies: data.allergies?.filter((_, i) => i !== index),
    });
  };

  const handleSubmit = async (skip = false) => {
    setIsLoading(true);
    try {
      await updateMedicalHistory({
        intakeId,
        medicalConditions: skip ? undefined : data.medicalConditions,
        medications: skip ? undefined : data.medications,
        allergies: skip ? undefined : data.allergies,
        medicalHistorySkipped: skip,
      });
      onNext();
    } catch (error) {
      toast.error("Failed to save medical history");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
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
        <h1 className="text-2xl font-bold">Medical History</h1>
        <p className="text-muted-foreground">
          Tell us about your health background
        </p>
      </div>

      <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 flex gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-amber-800">Optional Step</p>
          <p className="text-sm text-amber-700">
            This step is optional. You can skip and complete it later with your provider.
          </p>
        </div>
      </div>

      {/* Medical Conditions */}
      <SectionCard title="Medical Conditions" description="Current or past conditions">
        <div className="space-y-4">
          {data.medicalConditions && data.medicalConditions.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {data.medicalConditions.map((condition, index) => (
                <Badge key={index} variant="secondary" className="gap-1 py-1.5">
                  {condition.name}
                  {condition.status && (
                    <span className="text-xs opacity-70">({condition.status})</span>
                  )}
                  <button
                    type="button"
                    onClick={() => removeCondition(index)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
          <Button type="button" variant="outline" size="sm" onClick={() => setConditionDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Condition
          </Button>
        </div>
      </SectionCard>

      {/* Medications */}
      <SectionCard title="Current Medications" description="Medications you are currently taking">
        <div className="space-y-4">
          {data.medications && data.medications.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {data.medications.map((med, index) => (
                <Badge key={index} variant="secondary" className="gap-1 py-1.5">
                  {med.name}
                  {med.dosage && <span className="text-xs opacity-70">({med.dosage})</span>}
                  <button
                    type="button"
                    onClick={() => removeMedication(index)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
          <Button type="button" variant="outline" size="sm" onClick={() => setMedicationDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Medication
          </Button>
        </div>
      </SectionCard>

      {/* Allergies */}
      <SectionCard title="Allergies" description="Drug, food, or environmental allergies">
        <div className="space-y-4">
          {data.allergies && data.allergies.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {data.allergies.map((allergy, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className={`gap-1 py-1.5 ${getSeverityColor(allergy.severity)}`}
                >
                  {allergy.allergen}
                  <button
                    type="button"
                    onClick={() => removeAllergy(index)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
          <Button type="button" variant="outline" size="sm" onClick={() => setAllergyDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Allergy
          </Button>
        </div>
      </SectionCard>

      {/* Condition Dialog */}
      <Dialog open={conditionDialog} onOpenChange={setConditionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Medical Condition</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Condition Name *</Label>
              <Input
                value={newCondition.name}
                onChange={(e) => setNewCondition({ ...newCondition, name: e.target.value })}
                placeholder="e.g., Diabetes, Hypertension"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={newCondition.status || ""}
                  onValueChange={(value: "active" | "resolved" | "managed") =>
                    setNewCondition({ ...newCondition, status: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="managed">Managed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Severity</Label>
                <Select
                  value={newCondition.severity || ""}
                  onValueChange={(value: "mild" | "moderate" | "severe") =>
                    setNewCondition({ ...newCondition, severity: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select severity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mild">Mild</SelectItem>
                    <SelectItem value="moderate">Moderate</SelectItem>
                    <SelectItem value="severe">Severe</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConditionDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddCondition}>Add Condition</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Medication Dialog */}
      <Dialog open={medicationDialog} onOpenChange={setMedicationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Medication</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Medication Name *</Label>
              <Input
                value={newMedication.name}
                onChange={(e) => setNewMedication({ ...newMedication, name: e.target.value })}
                placeholder="e.g., Metformin, Lisinopril"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Dosage</Label>
                <Input
                  value={newMedication.dosage || ""}
                  onChange={(e) => setNewMedication({ ...newMedication, dosage: e.target.value })}
                  placeholder="e.g., 500mg"
                />
              </div>
              <div className="space-y-2">
                <Label>Frequency</Label>
                <Select
                  value={newMedication.frequency || ""}
                  onValueChange={(value: "daily" | "twice_daily" | "weekly" | "as_needed") =>
                    setNewMedication({ ...newMedication, frequency: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="twice_daily">Twice Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="as_needed">As Needed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMedicationDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddMedication}>Add Medication</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Allergy Dialog */}
      <Dialog open={allergyDialog} onOpenChange={setAllergyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Allergy</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Allergen *</Label>
              <Input
                value={newAllergy.allergen}
                onChange={(e) => setNewAllergy({ ...newAllergy, allergen: e.target.value })}
                placeholder="e.g., Penicillin, Peanuts"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Reaction</Label>
                <Input
                  value={newAllergy.reaction || ""}
                  onChange={(e) => setNewAllergy({ ...newAllergy, reaction: e.target.value })}
                  placeholder="e.g., Hives, Swelling"
                />
              </div>
              <div className="space-y-2">
                <Label>Severity *</Label>
                <Select
                  value={newAllergy.severity}
                  onValueChange={(value: "mild" | "moderate" | "severe" | "life_threatening") =>
                    setNewAllergy({ ...newAllergy, severity: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mild">Mild</SelectItem>
                    <SelectItem value="moderate">Moderate</SelectItem>
                    <SelectItem value="severe">Severe</SelectItem>
                    <SelectItem value="life_threatening">Life Threatening</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAllergyDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddAllergy}>Add Allergy</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex items-center justify-between pt-6 mt-6 border-t">
        <Button type="button" variant="outline" onClick={onBack} disabled={isLoading}>
          Back
        </Button>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => handleSubmit(true)}
            disabled={isLoading}
          >
            Skip for Now
          </Button>
          <Button type="button" onClick={() => handleSubmit(false)} disabled={isLoading}>
            Continue
          </Button>
        </div>
      </div>
    </div>
  );
}
