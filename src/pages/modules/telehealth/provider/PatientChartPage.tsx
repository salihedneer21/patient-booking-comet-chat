import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Doc, Id } from "../../../../../convex/_generated/dataModel";
import { useCurrentUser } from "@/lib/useCurrentUser";
import FullPageSpinner from "@/components/ui/FullPageSpinner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  User,
  Calendar,
  Pill,
  AlertTriangle,
  Heart,
  FileText,
  Plus,
  MessageSquare,
} from "lucide-react";
import { format } from "date-fns";
import toast from "react-hot-toast";

export default function PatientChartPage() {
  const navigate = useNavigate();
  const { patientId } = useParams<{ patientId: string }>();
  const { isLoading: userLoading } = useCurrentUser();
  const didAttemptSync = useRef(false);

  const [addConditionOpen, setAddConditionOpen] = useState(false);
  const [addMedicationOpen, setAddMedicationOpen] = useState(false);
  const [addAllergyOpen, setAddAllergyOpen] = useState(false);

  // Form states
  const [conditionName, setConditionName] = useState("");
  const [conditionDiagnosed, setConditionDiagnosed] = useState("");
  const [conditionNotes, setConditionNotes] = useState("");

  const [medicationName, setMedicationName] = useState("");
  const [medicationDosage, setMedicationDosage] = useState("");
  const [medicationFrequency, setMedicationFrequency] = useState("");
  const [medicationPrescribedFor, setMedicationPrescribedFor] = useState("");

  const [allergyAllergen, setAllergyAllergen] = useState("");
  const [allergyType, setAllergyType] = useState("medication");
  const [allergyReaction, setAllergyReaction] = useState("");
  const [allergySeverity, setAllergySeverity] = useState("mild");

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Queries - patientId from URL is a users ID (from appointments)
  const patientIntake = useQuery(
    api.modules.telehealth.patientIntake.getByUserId,
    patientId ? { userId: patientId as Id<"users"> } : "skip"
  ) as Doc<"patientIntake"> | null | undefined;

  // Medical history queries use patientIntake ID (once patientIntake is loaded)
  const conditions = useQuery(
    api.modules.telehealth.medicalHistory.getConditionsByPatient,
    patientIntake?._id ? { patientId: patientIntake._id } : "skip"
  ) as Doc<"medicalConditions">[] | undefined;

  const medications = useQuery(
    api.modules.telehealth.medicalHistory.getMedicationsByPatient,
    patientIntake?._id ? { patientId: patientIntake._id } : "skip"
  ) as Doc<"medications">[] | undefined;

  const allergies = useQuery(
    api.modules.telehealth.medicalHistory.getAllergiesByPatient,
    patientIntake?._id ? { patientId: patientIntake._id } : "skip"
  ) as Doc<"allergies">[] | undefined;

  const encounters = useQuery(
    api.modules.telehealth.encounters.listByPatient,
    patientIntake?._id ? { patientId: patientIntake._id } : "skip"
  ) as Doc<"encounters">[] | undefined;

  const appointments = useQuery(
    api.modules.telehealth.appointments.getByPatient,
    patientId ? { patientId: patientId as Id<"users"> } : "skip"
  ) as Doc<"appointments">[] | undefined;

  // Mutations
  const addCondition = useMutation(api.modules.telehealth.medicalHistory.addCondition);
  const addMedication = useMutation(api.modules.telehealth.medicalHistory.addMedication);
  const addAllergy = useMutation(api.modules.telehealth.medicalHistory.addAllergy);
  const syncFromIntake = useMutation(api.modules.telehealth.medicalHistory.syncFromIntake);

  useEffect(() => {
    if (didAttemptSync.current) return;
    if (!patientIntake) return;
    if (patientIntake.medicalHistorySkipped === true) return;
    if (conditions === undefined || medications === undefined || allergies === undefined) return;

    const embeddedHasData =
      (patientIntake.medicalConditions?.length ?? 0) > 0 ||
      (patientIntake.medications?.length ?? 0) > 0 ||
      (patientIntake.allergies?.length ?? 0) > 0;

    const tablesEmpty =
      conditions.length === 0 && medications.length === 0 && allergies.length === 0;

    if (!embeddedHasData || !tablesEmpty) return;

    didAttemptSync.current = true;
    void syncFromIntake({ patientId: patientIntake._id });
  }, [allergies, conditions, medications, patientIntake, syncFromIntake]);

  if (userLoading || patientIntake === undefined) {
    return <FullPageSpinner />;
  }

  if (!patientIntake) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <Card>
          <CardContent className="p-8 text-center">
            <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Patient record not found</p>
            <Button className="mt-4" onClick={() => navigate(-1)}>
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleAddCondition = async () => {
    if (!patientIntake || !conditionName.trim()) return;
    setIsSubmitting(true);
    try {
      await addCondition({
        patientId: patientIntake._id,
        conditionName: conditionName,
        dateOfOnset: conditionDiagnosed || undefined,
        notes: conditionNotes || undefined,
        status: "active",
      });
      toast.success("Condition added");
      setAddConditionOpen(false);
      setConditionName("");
      setConditionDiagnosed("");
      setConditionNotes("");
    } catch {
      toast.error("Failed to add condition");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddMedication = async () => {
    if (!patientIntake || !medicationName.trim() || !medicationDosage.trim()) return;
    setIsSubmitting(true);
    try {
      await addMedication({
        patientId: patientIntake._id,
        medicationName: medicationName,
        dosage: medicationDosage,
        frequency: medicationFrequency || "As needed",
        startDate: new Date().toISOString().split("T")[0],
        status: "active",
      });
      toast.success("Medication added");
      setAddMedicationOpen(false);
      setMedicationName("");
      setMedicationDosage("");
      setMedicationFrequency("");
      setMedicationPrescribedFor("");
    } catch {
      toast.error("Failed to add medication");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddAllergy = async () => {
    if (!patientIntake || !allergyAllergen.trim()) return;
    setIsSubmitting(true);
    try {
      await addAllergy({
        patientId: patientIntake._id,
        allergenName: allergyAllergen,
        allergenType: allergyType as "medication" | "food" | "environmental" | "other",
        reactionType: allergyReaction || "Unknown",
        severity: allergySeverity as "mild" | "moderate" | "severe" | "life_threatening",
      });
      toast.success("Allergy added");
      setAddAllergyOpen(false);
      setAllergyAllergen("");
      setAllergyType("medication");
      setAllergyReaction("");
      setAllergySeverity("mild");
    } catch {
      toast.error("Failed to add allergy");
    } finally {
      setIsSubmitting(false);
    }
  };

  const upcomingAppointments = appointments?.filter((a) => a.status === "upcoming") || [];

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">
            {patientIntake.firstName} {patientIntake.lastName}
          </h1>
          <p className="text-muted-foreground">Patient Chart</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => navigate("/provider/messages")}>
            <MessageSquare className="h-4 w-4 mr-2" />
            Message
          </Button>
          <Button onClick={() => navigate(`/provider/encounter/new?intakeId=${patientIntake._id}`)}>
            <Plus className="h-4 w-4 mr-2" />
            New Encounter
          </Button>
        </div>
      </div>

      {/* Patient Header Card */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-sm text-muted-foreground">Date of Birth</p>
              <p className="font-medium">{patientIntake.dateOfBirth || "Not provided"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Sex at Birth</p>
              <p className="font-medium capitalize">{patientIntake.sexAtBirth || "Not provided"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Phone</p>
              <p className="font-medium">{patientIntake.phone || "Not provided"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-medium">{patientIntake.email || "Not provided"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upcoming Appointments Alert */}
      {upcomingAppointments.length > 0 && (
        <Card className="mb-6 border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-blue-600" />
              <div>
                <p className="font-medium text-blue-800">
                  Next appointment: {format(new Date(upcomingAppointments[0].scheduledAt), "MMM d, yyyy 'at' h:mm a")}
                </p>
                <p className="text-sm text-blue-700">
                  {upcomingAppointments[0].reasonForVisit}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="conditions">Conditions ({conditions?.length || 0})</TabsTrigger>
          <TabsTrigger value="medications">Medications ({medications?.length || 0})</TabsTrigger>
          <TabsTrigger value="allergies">Allergies ({allergies?.length || 0})</TabsTrigger>
          <TabsTrigger value="encounters">Encounters ({encounters?.length || 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-red-100 text-red-600">
                    <Heart className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{conditions?.filter(c => c.status === "active").length || 0}</p>
                    <p className="text-sm text-muted-foreground">Active Conditions</p>
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
                    <p className="text-2xl font-bold">{medications?.filter(m => m.status === "active").length || 0}</p>
                    <p className="text-sm text-muted-foreground">Active Medications</p>
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
                    <p className="text-2xl font-bold">{allergies?.length || 0}</p>
                    <p className="text-sm text-muted-foreground">Known Allergies</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Encounters */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Encounters</CardTitle>
            </CardHeader>
            <CardContent>
              {!encounters || encounters.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No encounters recorded</p>
              ) : (
                <div className="space-y-4">
                  {encounters.slice(0, 5).map((encounter: Doc<"encounters">) => (
                    <div
                      key={encounter._id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer"
                      onClick={() => navigate(`/provider/encounter/${encounter._id}`)}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant={encounter.status === "finalized" ? "secondary" : "default"}>
                            {encounter.status}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {encounter.encounterDate}
                          </span>
                        </div>
                        <p className="font-medium mt-1">{encounter.chiefComplaint || "No chief complaint"}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(encounter._creationTime), "MMM d, yyyy")}
                        </p>
                      </div>
                      <Button variant="ghost" size="sm">
                        <FileText className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="conditions">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Medical Conditions</CardTitle>
                <Button size="sm" onClick={() => setAddConditionOpen(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Condition
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {!conditions || conditions.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No conditions on record</p>
              ) : (
                <div className="space-y-4">
                  {conditions.map((condition) => (
                    <div key={condition._id} className="flex items-start justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">{condition.conditionName}</p>
                        {condition.dateOfOnset && (
                          <p className="text-sm text-muted-foreground">
                            Onset: {condition.dateOfOnset}
                          </p>
                        )}
                        {condition.notes && (
                          <p className="text-sm text-muted-foreground mt-1">{condition.notes}</p>
                        )}
                      </div>
                      <Badge variant={condition.status === "active" ? "default" : "secondary"}>
                        {condition.status === "active" ? "Active" : "Resolved"}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="medications">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Medications</CardTitle>
                <Button size="sm" onClick={() => setAddMedicationOpen(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Medication
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {!medications || medications.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No medications on record</p>
              ) : (
                <div className="space-y-4">
                  {medications.map((medication) => (
                    <div key={medication._id} className="flex items-start justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">{medication.medicationName}</p>
                        <p className="text-sm text-muted-foreground">
                          {medication.dosage}
                          {medication.frequency && ` - ${medication.frequency}`}
                        </p>
                        {medication.startDate && (
                          <p className="text-sm text-muted-foreground">Started: {medication.startDate}</p>
                        )}
                      </div>
                      <Badge variant={medication.status === "active" ? "default" : "secondary"}>
                        {medication.status === "active" ? "Active" : "Discontinued"}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="allergies">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Allergies</CardTitle>
                <Button size="sm" onClick={() => setAddAllergyOpen(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Allergy
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {!allergies || allergies.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No allergies on record</p>
              ) : (
                <div className="space-y-4">
                  {allergies.map((allergy) => (
                    <div key={allergy._id} className="p-4 border rounded-lg">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium">{allergy.allergenName}</p>
                          <p className="text-sm text-muted-foreground">Type: {allergy.allergenType}</p>
                          {allergy.reactionType && (
                            <p className="text-sm text-muted-foreground">Reaction: {allergy.reactionType}</p>
                          )}
                        </div>
                        <Badge
                          variant={
                            allergy.severity === "severe" || allergy.severity === "life_threatening"
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
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="encounters">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Encounter History</CardTitle>
                <Button size="sm" onClick={() => navigate(`/provider/encounter/new?intakeId=${patientIntake._id}`)}>
                  <Plus className="h-4 w-4 mr-1" />
                  New Encounter
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {!encounters || encounters.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No encounters recorded</p>
              ) : (
                <div className="space-y-4">
                  {encounters.map((encounter: Doc<"encounters">) => (
                    <div
                      key={encounter._id}
                      className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer"
                      onClick={() => navigate(`/provider/encounter/${encounter._id}`)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant={encounter.status === "finalized" ? "secondary" : "default"}>
                            {encounter.status}
                          </Badge>
                          <span className="text-sm text-muted-foreground">{encounter.encounterDate}</span>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(encounter._creationTime), "MMM d, yyyy")}
                        </span>
                      </div>
                      <p className="font-medium">{encounter.chiefComplaint || "No chief complaint"}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Condition Dialog */}
      <Dialog open={addConditionOpen} onOpenChange={setAddConditionOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Medical Condition</DialogTitle>
            <DialogDescription>
              Add a new medical condition to the patient's record
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Condition Name *</Label>
              <Input
                value={conditionName}
                onChange={(e) => setConditionName(e.target.value)}
                placeholder="e.g., Type 2 Diabetes"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Date Diagnosed</Label>
              <Input
                value={conditionDiagnosed}
                onChange={(e) => setConditionDiagnosed(e.target.value)}
                placeholder="e.g., January 2020"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                value={conditionNotes}
                onChange={(e) => setConditionNotes(e.target.value)}
                placeholder="Additional notes..."
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddConditionOpen(false)}>Cancel</Button>
            <Button onClick={handleAddCondition} disabled={isSubmitting || !conditionName.trim()}>
              {isSubmitting ? "Adding..." : "Add Condition"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Medication Dialog */}
      <Dialog open={addMedicationOpen} onOpenChange={setAddMedicationOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Medication</DialogTitle>
            <DialogDescription>
              Add a new medication to the patient's record
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Medication Name *</Label>
              <Input
                value={medicationName}
                onChange={(e) => setMedicationName(e.target.value)}
                placeholder="e.g., Metformin"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Dosage *</Label>
              <Input
                value={medicationDosage}
                onChange={(e) => setMedicationDosage(e.target.value)}
                placeholder="e.g., 500mg"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Frequency</Label>
              <Input
                value={medicationFrequency}
                onChange={(e) => setMedicationFrequency(e.target.value)}
                placeholder="e.g., Twice daily"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Prescribed For</Label>
              <Input
                value={medicationPrescribedFor}
                onChange={(e) => setMedicationPrescribedFor(e.target.value)}
                placeholder="e.g., Blood sugar control"
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddMedicationOpen(false)}>Cancel</Button>
            <Button onClick={handleAddMedication} disabled={isSubmitting || !medicationName.trim() || !medicationDosage.trim()}>
              {isSubmitting ? "Adding..." : "Add Medication"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Allergy Dialog */}
      <Dialog open={addAllergyOpen} onOpenChange={setAddAllergyOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Allergy</DialogTitle>
            <DialogDescription>
              Add a new allergy to the patient's record
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Allergen *</Label>
              <Input
                value={allergyAllergen}
                onChange={(e) => setAllergyAllergen(e.target.value)}
                placeholder="e.g., Penicillin"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Type</Label>
              <Select value={allergyType} onValueChange={setAllergyType}>
                <SelectTrigger className="mt-1">
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
            <div>
              <Label>Reaction</Label>
              <Input
                value={allergyReaction}
                onChange={(e) => setAllergyReaction(e.target.value)}
                placeholder="e.g., Hives, difficulty breathing"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Severity</Label>
              <Select value={allergySeverity} onValueChange={setAllergySeverity}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mild">Mild</SelectItem>
                  <SelectItem value="moderate">Moderate</SelectItem>
                  <SelectItem value="severe">Severe</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddAllergyOpen(false)}>Cancel</Button>
            <Button onClick={handleAddAllergy} disabled={isSubmitting || !allergyAllergen.trim()}>
              {isSubmitting ? "Adding..." : "Add Allergy"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
