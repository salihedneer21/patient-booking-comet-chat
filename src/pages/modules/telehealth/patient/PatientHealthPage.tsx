import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Doc } from "../../../../../convex/_generated/dataModel";
import { useCurrentUser } from "@/lib/useCurrentUser";
import FullPageSpinner from "@/components/ui/FullPageSpinner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  Heart,
  Pill,
  AlertTriangle,
  FileText,
  Calendar,
  User,
  Activity,
} from "lucide-react";
import { format } from "date-fns";
import toast from "react-hot-toast";

export default function PatientHealthPage() {
  const navigate = useNavigate();
  const { user, isLoading: userLoading } = useCurrentUser();
  const didAttemptSync = useRef(false);
  const [addConditionOpen, setAddConditionOpen] = useState(false);
  const [addMedicationOpen, setAddMedicationOpen] = useState(false);
  const [addAllergyOpen, setAddAllergyOpen] = useState(false);

  const [newConditionName, setNewConditionName] = useState("");
  const [newConditionStatus, setNewConditionStatus] = useState<
    "active" | "resolved" | "chronic"
  >("active");
  const [newConditionSeverity, setNewConditionSeverity] = useState<
    "" | "mild" | "moderate" | "severe"
  >("");
  const [newConditionOnsetDate, setNewConditionOnsetDate] = useState("");
  const [newConditionNotes, setNewConditionNotes] = useState("");

  const [newMedicationName, setNewMedicationName] = useState("");
  const [newMedicationDosage, setNewMedicationDosage] = useState("");
  const [newMedicationFrequency, setNewMedicationFrequency] = useState("As needed");
  const [newMedicationStartDate, setNewMedicationStartDate] = useState(
    () => new Date().toISOString().split("T")[0],
  );

  const [newAllergyAllergen, setNewAllergyAllergen] = useState("");
  const [newAllergyType, setNewAllergyType] = useState<
    "medication" | "food" | "environmental" | "other"
  >("other");
  const [newAllergySeverity, setNewAllergySeverity] = useState<
    "mild" | "moderate" | "severe" | "life_threatening"
  >("mild");
  const [newAllergyReaction, setNewAllergyReaction] = useState("");
  const [newAllergyNotes, setNewAllergyNotes] = useState("");

  const [isAddingCondition, setIsAddingCondition] = useState(false);
  const [isAddingMedication, setIsAddingMedication] = useState(false);
  const [isAddingAllergy, setIsAddingAllergy] = useState(false);

  const intake = useQuery(
    api.modules.telehealth.patientIntake.getMyIntake,
    user?._id ? { userId: user._id } : "skip"
  ) as Doc<"patientIntake"> | null | undefined;

  const syncFromIntake = useMutation(api.modules.telehealth.medicalHistory.syncFromIntake);
  const patientAddMedication = useMutation(
    api.modules.telehealth.medicalHistory.patientAddMedication,
  );
  const patientAddCondition = useMutation(
    api.modules.telehealth.medicalHistory.patientAddCondition,
  );
  const patientAddAllergy = useMutation(
    api.modules.telehealth.medicalHistory.patientAddAllergy,
  );

  const conditions = useQuery(
    api.modules.telehealth.medicalHistory.getConditionsByPatient,
    intake?._id ? { patientId: intake._id } : "skip"
  ) as Doc<"medicalConditions">[] | undefined;

  const medications = useQuery(
    api.modules.telehealth.medicalHistory.getMedicationsByPatient,
    intake?._id ? { patientId: intake._id } : "skip"
  ) as Doc<"medications">[] | undefined;

  const allergies = useQuery(
    api.modules.telehealth.medicalHistory.getAllergiesByPatient,
    intake?._id ? { patientId: intake._id } : "skip"
  ) as Doc<"allergies">[] | undefined;

  const encounters = useQuery(
    api.modules.telehealth.encounters.listByPatient,
    intake?._id ? { patientId: intake._id } : "skip"
  ) as Doc<"encounters">[] | undefined;

  useEffect(() => {
    if (didAttemptSync.current) return;
    if (!intake) return;
    if (intake.medicalHistorySkipped === true) return;
    if (conditions === undefined || medications === undefined || allergies === undefined) return;

    const embeddedHasData =
      (intake.medicalConditions?.length ?? 0) > 0 ||
      (intake.medications?.length ?? 0) > 0 ||
      (intake.allergies?.length ?? 0) > 0;

    const tablesEmpty =
      conditions.length === 0 && medications.length === 0 && allergies.length === 0;

    if (!embeddedHasData || !tablesEmpty) return;

    didAttemptSync.current = true;
    void syncFromIntake({ patientId: intake._id });
  }, [allergies, conditions, intake, medications, syncFromIntake]);

  if (userLoading || intake === undefined) {
    return <FullPageSpinner />;
  }

  const completedEncounters = encounters?.filter((e) => e.status === "finalized") ?? [];
  const conditionCount = conditions?.length ?? intake?.medicalConditions?.length ?? 0;
  const medicationCount = medications?.length ?? intake?.medications?.length ?? 0;
  const allergyCount = allergies?.length ?? intake?.allergies?.length ?? 0;

  const handleAddMedication = async () => {
    if (!intake) return;

    const medicationName = newMedicationName.trim();
    if (!medicationName) {
      toast.error("Medication name is required");
      return;
    }

    setIsAddingMedication(true);
    try {
      await patientAddMedication({
        patientId: intake._id,
        medicationName,
        dosage: newMedicationDosage.trim() ? newMedicationDosage.trim() : undefined,
        frequency: newMedicationFrequency || undefined,
        startDate: newMedicationStartDate || undefined,
      });
      toast.success("Medication added");
      setAddMedicationOpen(false);
      setNewMedicationName("");
      setNewMedicationDosage("");
      setNewMedicationFrequency("As needed");
      setNewMedicationStartDate(new Date().toISOString().split("T")[0]);
    } catch {
      toast.error("Failed to add medication");
    } finally {
      setIsAddingMedication(false);
    }
  };

  const handleAddCondition = async () => {
    if (!intake) return;

    const conditionName = newConditionName.trim();
    if (!conditionName) {
      toast.error("Condition name is required");
      return;
    }

    setIsAddingCondition(true);
    try {
      await patientAddCondition({
        patientId: intake._id,
        conditionName,
        status: newConditionStatus,
        severity: newConditionSeverity ? newConditionSeverity : undefined,
        dateOfOnset: newConditionOnsetDate || undefined,
        notes: newConditionNotes.trim() ? newConditionNotes.trim() : undefined,
      });
      toast.success("Condition added");
      setAddConditionOpen(false);
      setNewConditionName("");
      setNewConditionStatus("active");
      setNewConditionSeverity("");
      setNewConditionOnsetDate("");
      setNewConditionNotes("");
    } catch {
      toast.error("Failed to add condition");
    } finally {
      setIsAddingCondition(false);
    }
  };

  const handleAddAllergy = async () => {
    if (!intake) return;

    const allergenName = newAllergyAllergen.trim();
    if (!allergenName) {
      toast.error("Allergen name is required");
      return;
    }

    setIsAddingAllergy(true);
    try {
      await patientAddAllergy({
        patientId: intake._id,
        allergenName,
        allergenType: newAllergyType,
        reactionType: newAllergyReaction.trim() ? newAllergyReaction.trim() : undefined,
        severity: newAllergySeverity,
        notes: newAllergyNotes.trim() ? newAllergyNotes.trim() : undefined,
      });
      toast.success("Allergy added");
      setAddAllergyOpen(false);
      setNewAllergyAllergen("");
      setNewAllergyType("other");
      setNewAllergySeverity("mild");
      setNewAllergyReaction("");
      setNewAllergyNotes("");
    } catch {
      toast.error("Failed to add allergy");
    } finally {
      setIsAddingAllergy(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Health Records</h1>
          <p className="text-muted-foreground">View your medical information</p>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="conditions">Conditions</TabsTrigger>
          <TabsTrigger value="medications">Medications</TabsTrigger>
          <TabsTrigger value="allergies">Allergies</TabsTrigger>
          <TabsTrigger value="visits">Past Visits</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Basic Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground">Full Name</p>
                  <p className="font-medium">
                    {intake?.firstName} {intake?.lastName}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Date of Birth</p>
                  <p className="font-medium">{intake?.dateOfBirth || "Not provided"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Sex at Birth</p>
                  <p className="font-medium capitalize">{intake?.sexAtBirth || "Not provided"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="font-medium">{intake?.phone || "Not provided"}</p>
                </div>
                {intake?.weightLbs && (
                  <div>
                    <p className="text-sm text-muted-foreground">Weight</p>
                    <p className="font-medium">{intake.weightLbs} lbs</p>
                  </div>
                )}
                {(intake?.heightFt || intake?.heightIn) && (
                  <div>
                    <p className="text-sm text-muted-foreground">Height</p>
                    <p className="font-medium">
                      {intake.heightFt || 0}' {intake.heightIn || 0}"
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quick Summary Cards */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-red-100 text-red-600">
                    <Heart className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{conditionCount}</p>
                    <p className="text-sm text-muted-foreground">Conditions</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                    <Pill className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{medicationCount}</p>
                    <p className="text-sm text-muted-foreground">Medications</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-yellow-100 text-yellow-600">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{allergyCount}</p>
                    <p className="text-sm text-muted-foreground">Allergies</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Insurance Info */}
          {intake?.insuranceProvider && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Insurance Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-sm text-muted-foreground">Provider</p>
                    <p className="font-medium">{intake.insuranceProvider}</p>
                  </div>
                  {intake.policyNumber && (
                    <div>
                      <p className="text-sm text-muted-foreground">Policy Number</p>
                      <p className="font-medium">{intake.policyNumber}</p>
                    </div>
                  )}
                  {intake.groupNumber && (
                    <div>
                      <p className="text-sm text-muted-foreground">Group Number</p>
                      <p className="font-medium">{intake.groupNumber}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="conditions" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                  <CardTitle className="flex items-center gap-2">
                    <Heart className="h-5 w-5" />
                    Medical Conditions
                  </CardTitle>
                  <CardDescription>
                    Your diagnosed medical conditions
                  </CardDescription>
                </div>
                <Button
                  size="sm"
                  className="sm:mt-1"
                  onClick={() => setAddConditionOpen(true)}
                  disabled={!intake}
                >
                  Add condition
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {conditions === undefined ? (
                <p className="text-muted-foreground text-center py-8">Loading…</p>
              ) : conditions.length > 0 ? (
                <div className="space-y-4">
                  {conditions.map((condition) => (
                    <div
                      key={condition._id}
                      className="flex items-start justify-between p-4 border rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{condition.conditionName}</p>
                        {condition.dateOfOnset && (
                          <p className="text-sm text-muted-foreground">
                            Diagnosed: {condition.dateOfOnset}
                          </p>
                        )}
                        {condition.notes && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {condition.notes}
                          </p>
                        )}
                      </div>
                      <Badge variant={condition.status === "active" ? "default" : "secondary"}>
                        {condition.status === "active"
                          ? "Active"
                          : condition.status === "chronic"
                            ? "Chronic"
                            : "Resolved"}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : intake?.medicalConditions && intake.medicalConditions.length > 0 ? (
                <div className="space-y-4">
                  {intake.medicalConditions.map((condition, index) => (
                    <div
                      key={`${condition.name}-${index}`}
                      className="flex items-start justify-between p-4 border rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{condition.name}</p>
                        {condition.onsetDate && (
                          <p className="text-sm text-muted-foreground">
                            Onset: {condition.onsetDate}
                          </p>
                        )}
                      </div>
                      <Badge variant={condition.status === "active" ? "default" : "secondary"}>
                        {condition.status === "active"
                          ? "Active"
                          : condition.status === "managed"
                            ? "Chronic"
                            : "Resolved"}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  No conditions on record
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="medications" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                  <CardTitle className="flex items-center gap-2">
                    <Pill className="h-5 w-5" />
                    Current Medications
                  </CardTitle>
                  <CardDescription>
                    Medications you are currently taking
                  </CardDescription>
                </div>
                <Button
                  size="sm"
                  className="sm:mt-1"
                  onClick={() => setAddMedicationOpen(true)}
                  disabled={!intake}
                >
                  Add medication
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {medications === undefined ? (
                <p className="text-muted-foreground text-center py-8">Loading…</p>
              ) : medications.length > 0 ? (
                <div className="space-y-4">
                  {medications.map((medication) => (
                    <div
                      key={medication._id}
                      className="flex items-start justify-between p-4 border rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{medication.medicationName}</p>
                        <p className="text-sm text-muted-foreground">
                          {medication.dosage}
                          {medication.frequency && ` - ${medication.frequency}`}
                        </p>
                      </div>
                      <Badge variant={medication.status === "active" ? "default" : "secondary"}>
                        {medication.status === "active" ? "Active" : "Discontinued"}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : intake?.medications && intake.medications.length > 0 ? (
                <div className="space-y-4">
                  {intake.medications.map((medication, index) => (
                    <div
                      key={`${medication.name}-${index}`}
                      className="flex items-start justify-between p-4 border rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{medication.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {medication.dosage || "Unknown"}
                          {medication.frequency && ` - ${medication.frequency.replaceAll("_", " ")}`}
                        </p>
                      </div>
                      <Badge variant="default">Active</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  No medications on record
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="allergies" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    Known Allergies
                  </CardTitle>
                  <CardDescription>
                    Allergies that may affect your care
                  </CardDescription>
                </div>
                <Button
                  size="sm"
                  className="sm:mt-1"
                  onClick={() => setAddAllergyOpen(true)}
                  disabled={!intake}
                >
                  Add allergy
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {allergies === undefined ? (
                <p className="text-muted-foreground text-center py-8">Loading…</p>
              ) : allergies.length > 0 ? (
                <div className="space-y-4">
                  {allergies.map((allergy) => (
                    <div
                      key={allergy._id}
                      className="p-4 border rounded-lg"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium">{allergy.allergenName}</p>
                          <p className="text-sm text-muted-foreground">
                            Type: {allergy.allergenType}
                          </p>
                          {allergy.reactionType && (
                            <p className="text-sm text-muted-foreground">
                              Reaction: {allergy.reactionType}
                            </p>
                          )}
                        </div>
                        <Badge
                          variant={
                            allergy.severity === "severe"
                              ? "destructive"
                              : allergy.severity === "moderate"
                                ? "default"
                                : "secondary"
                          }
                        >
                          {allergy.severity}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : intake?.allergies && intake.allergies.length > 0 ? (
                <div className="space-y-4">
                  {intake.allergies.map((allergy, index) => (
                    <div key={`${allergy.allergen}-${index}`} className="p-4 border rounded-lg">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium">{allergy.allergen}</p>
                          {allergy.reaction && (
                            <p className="text-sm text-muted-foreground">
                              Reaction: {allergy.reaction}
                            </p>
                          )}
                        </div>
                        <Badge
                          variant={
                            allergy.severity === "severe"
                              ? "destructive"
                              : allergy.severity === "moderate"
                                ? "default"
                                : "secondary"
                          }
                        >
                          {allergy.severity}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  No allergies on record
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="visits" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Past Visits
              </CardTitle>
              <CardDescription>
                Your completed encounters and visit summaries
              </CardDescription>
            </CardHeader>
            <CardContent>
              {completedEncounters.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No past visits on record
                </p>
              ) : (
                <Accordion type="single" collapsible className="w-full">
                  {completedEncounters.map((encounter: (typeof completedEncounters)[number]) => (
                    <AccordionItem key={encounter._id} value={encounter._id}>
                      <AccordionTrigger>
                        <div className="flex items-center gap-4 text-left">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium">
                              {format(new Date(encounter._creationTime), "MMMM d, yyyy")}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Telehealth Visit
                            </p>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-4 pt-4">
                          {encounter.chiefComplaint && (
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">
                                Chief Complaint
                              </p>
                              <p>{encounter.chiefComplaint}</p>
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">
                              Visit Date
                            </p>
                            <p>{encounter.encounterDate}</p>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog
        open={addMedicationOpen}
        onOpenChange={(open) => {
          if (!open && !isAddingMedication) setAddMedicationOpen(false);
          if (open) setAddMedicationOpen(true);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add medication</DialogTitle>
            <DialogDescription>
              Add something new to your medication list.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="medicationName">Medication name *</Label>
              <Input
                id="medicationName"
                value={newMedicationName}
                onChange={(e) => setNewMedicationName(e.target.value)}
                placeholder="e.g., Metformin"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="medicationDosage">Dosage</Label>
                <Input
                  id="medicationDosage"
                  value={newMedicationDosage}
                  onChange={(e) => setNewMedicationDosage(e.target.value)}
                  placeholder="e.g., 500mg"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="medicationFrequency">Frequency</Label>
                <Select
                  value={newMedicationFrequency}
                  onValueChange={(value) => setNewMedicationFrequency(value)}
                >
                  <SelectTrigger id="medicationFrequency">
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Daily">Daily</SelectItem>
                    <SelectItem value="Twice daily">Twice daily</SelectItem>
                    <SelectItem value="Weekly">Weekly</SelectItem>
                    <SelectItem value="As needed">As needed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="medicationStartDate">Start date</Label>
              <Input
                id="medicationStartDate"
                type="date"
                value={newMedicationStartDate}
                onChange={(e) => setNewMedicationStartDate(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setAddMedicationOpen(false)}
              disabled={isAddingMedication}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleAddMedication}
              disabled={isAddingMedication || !intake}
            >
              {isAddingMedication ? "Adding..." : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={addConditionOpen}
        onOpenChange={(open) => {
          if (isAddingCondition) return;
          setAddConditionOpen(open);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add condition</DialogTitle>
            <DialogDescription>
              Add something new to your conditions list.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="conditionName">Condition name *</Label>
              <Input
                id="conditionName"
                value={newConditionName}
                onChange={(e) => setNewConditionName(e.target.value)}
                placeholder="e.g., Hypertension"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="conditionStatus">Status</Label>
                <Select
                  value={newConditionStatus}
                  onValueChange={(value) =>
                    setNewConditionStatus(value as typeof newConditionStatus)
                  }
                >
                  <SelectTrigger id="conditionStatus">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="chronic">Chronic</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="conditionSeverity">Severity</Label>
                <Select
                  value={newConditionSeverity || undefined}
                  onValueChange={(value) =>
                    setNewConditionSeverity(value as typeof newConditionSeverity)
                  }
                >
                  <SelectTrigger id="conditionSeverity">
                    <SelectValue placeholder="Optional" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mild">Mild</SelectItem>
                    <SelectItem value="moderate">Moderate</SelectItem>
                    <SelectItem value="severe">Severe</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="conditionOnsetDate">Onset date</Label>
              <Input
                id="conditionOnsetDate"
                type="date"
                value={newConditionOnsetDate}
                onChange={(e) => setNewConditionOnsetDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="conditionNotes">Notes</Label>
              <Textarea
                id="conditionNotes"
                value={newConditionNotes}
                onChange={(e) => setNewConditionNotes(e.target.value)}
                placeholder="Optional details (e.g., triggers, past treatments)…"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setAddConditionOpen(false)}
              disabled={isAddingCondition}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleAddCondition}
              disabled={isAddingCondition || !intake}
            >
              {isAddingCondition ? "Adding..." : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={addAllergyOpen}
        onOpenChange={(open) => {
          if (isAddingAllergy) return;
          setAddAllergyOpen(open);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add allergy</DialogTitle>
            <DialogDescription>
              Add something new to your allergy list.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="allergyAllergen">Allergen *</Label>
              <Input
                id="allergyAllergen"
                value={newAllergyAllergen}
                onChange={(e) => setNewAllergyAllergen(e.target.value)}
                placeholder="e.g., Penicillin"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="allergyType">Type</Label>
                <Select
                  value={newAllergyType}
                  onValueChange={(value) =>
                    setNewAllergyType(value as typeof newAllergyType)
                  }
                >
                  <SelectTrigger id="allergyType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="medication">Medication</SelectItem>
                    <SelectItem value="food">Food</SelectItem>
                    <SelectItem value="environmental">Environmental</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="allergySeverity">Severity</Label>
                <Select
                  value={newAllergySeverity}
                  onValueChange={(value) =>
                    setNewAllergySeverity(value as typeof newAllergySeverity)
                  }
                >
                  <SelectTrigger id="allergySeverity">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mild">Mild</SelectItem>
                    <SelectItem value="moderate">Moderate</SelectItem>
                    <SelectItem value="severe">Severe</SelectItem>
                    <SelectItem value="life_threatening">Life threatening</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="allergyReaction">Reaction</Label>
              <Input
                id="allergyReaction"
                value={newAllergyReaction}
                onChange={(e) => setNewAllergyReaction(e.target.value)}
                placeholder="e.g., Hives"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="allergyNotes">Notes</Label>
              <Textarea
                id="allergyNotes"
                value={newAllergyNotes}
                onChange={(e) => setNewAllergyNotes(e.target.value)}
                placeholder="Optional details…"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setAddAllergyOpen(false)}
              disabled={isAddingAllergy}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleAddAllergy}
              disabled={isAddingAllergy || !intake}
            >
              {isAddingAllergy ? "Adding..." : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
