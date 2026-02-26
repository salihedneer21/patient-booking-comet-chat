import { useState, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { useCurrentUser } from "@/lib/useCurrentUser";
import FullPageSpinner from "@/components/ui/FullPageSpinner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Save,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { format } from "date-fns";
import toast from "react-hot-toast";

export default function EncounterPage() {
  const navigate = useNavigate();
  const { encounterId } = useParams<{ encounterId: string }>();
  const [searchParams] = useSearchParams();
  const intakeIdParam = searchParams.get("intakeId") ?? searchParams.get("patientId");
  const { user, isLoading: userLoading } = useCurrentUser();

  const isNewEncounter = encounterId === "new";

  // Form states
  const [chiefComplaint, setChiefComplaint] = useState("");

  // SOAP Notes
  const [subjective, setSubjective] = useState("");
  const [objective, setObjective] = useState("");
  const [assessment, setAssessment] = useState("");
  const [plan, setPlan] = useState("");

  const [isSaving, setIsSaving] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);

  // Queries
  const encounterData = useQuery(
    api.modules.telehealth.encounters.getById,
    !isNewEncounter && encounterId ? { encounterId: encounterId as Id<"encounters"> } : "skip"
  );

  const patientIntake = useQuery(
    api.modules.telehealth.patientIntake.getById,
    intakeIdParam ? { intakeId: intakeIdParam as Id<"patientIntake"> } :
    (encounterData?.encounter?.patientId ? { intakeId: encounterData.encounter.patientId } : "skip")
  );

  // Mutations
  const createEncounter = useMutation(api.modules.telehealth.encounters.create);
  const updateChiefComplaint = useMutation(api.modules.telehealth.encounters.updateChiefComplaint);
  const updateSOAP = useMutation(api.modules.telehealth.encounters.updateSOAP);
  const finalizeEncounter = useMutation(api.modules.telehealth.encounters.finalize);

  // Load existing data
  useEffect(() => {
    if (encounterData?.encounter) {
      setChiefComplaint(encounterData.encounter.chiefComplaint || "");
    }
  }, [encounterData?.encounter]);

  useEffect(() => {
    if (encounterData?.soapNote) {
      setSubjective(encounterData.soapNote.subjective || "");
      setObjective(encounterData.soapNote.objective || "");
      setAssessment(encounterData.soapNote.assessment || "");
      setPlan(encounterData.soapNote.plan || "");
    }
  }, [encounterData?.soapNote]);

  if (userLoading) {
    return <FullPageSpinner />;
  }

  if (!isNewEncounter && encounterData === undefined) {
    return <FullPageSpinner />;
  }

  if (!isNewEncounter && encounterData === null) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card>
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
            <p className="text-muted-foreground">Encounter not found</p>
            <Button className="mt-4" onClick={() => navigate(-1)}>
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);

    try {
      if (isNewEncounter) {
        if (!patientIntake || !chiefComplaint.trim()) {
          toast.error("Patient and chief complaint are required");
          setIsSaving(false);
          return;
        }

        const newEncounterId = await createEncounter({
          patientId: patientIntake._id,
          providerId: user._id as Id<"users">,
          chiefComplaint: chiefComplaint || undefined,
        });

        // Update SOAP note if any fields are filled
        if (subjective || objective || assessment || plan) {
          await updateSOAP({
            encounterId: newEncounterId,
            subjective: subjective || undefined,
            objective: objective || undefined,
            assessment: assessment || undefined,
            plan: plan || undefined,
          });
        }

        toast.success("Encounter created");
        navigate(`/provider/encounter/${newEncounterId}`, { replace: true });
      } else if (encounterId) {
        // Update existing encounter
        if (chiefComplaint !== (encounterData?.encounter?.chiefComplaint || "")) {
          await updateChiefComplaint({
            encounterId: encounterId as Id<"encounters">,
            chiefComplaint,
          });
        }

        // Update SOAP note
        await updateSOAP({
          encounterId: encounterId as Id<"encounters">,
          subjective: subjective || undefined,
          objective: objective || undefined,
          assessment: assessment || undefined,
          plan: plan || undefined,
        });

        toast.success("Encounter saved");
      }
    } catch {
      toast.error("Failed to save encounter");
    } finally {
      setIsSaving(false);
    }
  };

  const handleFinalize = async () => {
    if (!encounterId || isNewEncounter) return;
    setIsFinalizing(true);

    try {
      await finalizeEncounter({ encounterId: encounterId as Id<"encounters"> });
      toast.success("Encounter finalized");
      navigate(-1);
    } catch {
      toast.error("Failed to finalize encounter");
    } finally {
      setIsFinalizing(false);
    }
  };

  const isReadOnly = encounterData?.encounter?.status === "finalized";

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              {isNewEncounter ? "New Encounter" : "Encounter Details"}
            </h1>
            {patientIntake && (
              <p className="text-muted-foreground">
                Patient: {patientIntake.firstName} {patientIntake.lastName}
              </p>
            )}
          </div>
        </div>
        {!isReadOnly && (
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleSave} disabled={isSaving}>
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? "Saving..." : "Save Draft"}
            </Button>
            {!isNewEncounter && (
              <Button onClick={handleFinalize} disabled={isFinalizing}>
                <CheckCircle className="h-4 w-4 mr-2" />
                {isFinalizing ? "Finalizing..." : "Finalize Encounter"}
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Status Badge */}
      {!isNewEncounter && encounterData?.encounter && (
        <div className="mb-6">
          <Badge variant={encounterData.encounter.status === "finalized" ? "secondary" : "default"}>
            {encounterData.encounter.status === "finalized" ? "Finalized" : "Draft"}
          </Badge>
          <span className="ml-3 text-sm text-muted-foreground">
            Created: {format(new Date(encounterData.encounter._creationTime), "MMM d, yyyy 'at' h:mm a")}
          </span>
        </div>
      )}

      <Tabs defaultValue="encounter" className="space-y-6">
        <TabsList>
          <TabsTrigger value="encounter">Encounter Info</TabsTrigger>
          <TabsTrigger value="soap">SOAP Notes</TabsTrigger>
        </TabsList>

        <TabsContent value="encounter">
          <Card>
            <CardHeader>
              <CardTitle>Encounter Information</CardTitle>
              <CardDescription>
                Basic information about this visit
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {isNewEncounter && intakeIdParam && (
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    Patient intake ID: {patientIntake?._id ?? intakeIdParam}
                  </p>
                </div>
              )}

              <div>
                <Label>Chief Complaint *</Label>
                <Textarea
                  value={chiefComplaint}
                  onChange={(e) => setChiefComplaint(e.target.value)}
                  placeholder="What brings the patient in today?"
                  className="mt-1"
                  rows={3}
                  disabled={isReadOnly}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="soap">
          <Card>
            <CardHeader>
              <CardTitle>SOAP Notes</CardTitle>
              <CardDescription>
                Structured clinical documentation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label className="text-base font-semibold">Subjective</Label>
                <p className="text-sm text-muted-foreground mb-2">
                  Patient's description of symptoms, history of present illness
                </p>
                <Textarea
                  value={subjective}
                  onChange={(e) => setSubjective(e.target.value)}
                  placeholder="Patient reports..."
                  rows={4}
                  disabled={isReadOnly}
                />
              </div>

              <Separator />

              <div>
                <Label className="text-base font-semibold">Objective</Label>
                <p className="text-sm text-muted-foreground mb-2">
                  Physical exam findings, vital signs, test results
                </p>
                <Textarea
                  value={objective}
                  onChange={(e) => setObjective(e.target.value)}
                  placeholder="Physical examination reveals..."
                  rows={4}
                  disabled={isReadOnly}
                />
              </div>

              <Separator />

              <div>
                <Label className="text-base font-semibold">Assessment</Label>
                <p className="text-sm text-muted-foreground mb-2">
                  Clinical interpretation and diagnosis
                </p>
                <Textarea
                  value={assessment}
                  onChange={(e) => setAssessment(e.target.value)}
                  placeholder="Based on the subjective and objective findings..."
                  rows={4}
                  disabled={isReadOnly}
                />
              </div>

              <Separator />

              <div>
                <Label className="text-base font-semibold">Plan</Label>
                <p className="text-sm text-muted-foreground mb-2">
                  Treatment plan, medications, referrals, follow-up
                </p>
                <Textarea
                  value={plan}
                  onChange={(e) => setPlan(e.target.value)}
                  placeholder="Plan includes..."
                  rows={4}
                  disabled={isReadOnly}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Action Buttons */}
      {!isReadOnly && (
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outline" onClick={() => navigate(-1)}>
            Cancel
          </Button>
          <Button variant="outline" onClick={handleSave} disabled={isSaving}>
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? "Saving..." : "Save Draft"}
          </Button>
          {!isNewEncounter && (
            <Button onClick={handleFinalize} disabled={isFinalizing}>
              <CheckCircle className="h-4 w-4 mr-2" />
              {isFinalizing ? "Finalizing..." : "Finalize Encounter"}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
