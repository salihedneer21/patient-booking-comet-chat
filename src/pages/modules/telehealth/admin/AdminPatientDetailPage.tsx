import { useEffect, useMemo, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Doc, Id } from "../../../../../convex/_generated/dataModel";
import FullPageSpinner from "@/components/ui/FullPageSpinner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  AlertTriangle,
  Calendar,
  FileText,
  Heart,
  Mail,
  MapPin,
  Phone,
  Pill,
  Shield,
  User,
} from "lucide-react";
import { format } from "date-fns";

export default function AdminPatientDetailPage() {
  const navigate = useNavigate();
  const { patientId } = useParams<{ patientId: string }>();
  const didAttemptSync = useRef(false);

  const user = useQuery(
    api.users.getById,
    patientId ? { userId: patientId as Id<"users"> } : "skip",
  ) as Doc<"users"> | null | undefined;

  const intake = useQuery(
    api.modules.telehealth.patientIntake.getByUserId,
    patientId ? { userId: patientId as Id<"users"> } : "skip",
  ) as Doc<"patientIntake"> | null | undefined;

  const syncFromIntake = useMutation(api.modules.telehealth.medicalHistory.syncFromIntake);

  const appointments = useQuery(
    api.modules.telehealth.appointments.getByPatient,
    patientId ? { patientId: patientId as Id<"users"> } : "skip",
  ) as Doc<"appointments">[] | undefined;

  const conditions = useQuery(
    api.modules.telehealth.medicalHistory.getConditionsByPatient,
    intake?._id ? { patientId: intake._id } : "skip",
  ) as Doc<"medicalConditions">[] | undefined;

  const medications = useQuery(
    api.modules.telehealth.medicalHistory.getMedicationsByPatient,
    intake?._id ? { patientId: intake._id } : "skip",
  ) as Doc<"medications">[] | undefined;

  const allergies = useQuery(
    api.modules.telehealth.medicalHistory.getAllergiesByPatient,
    intake?._id ? { patientId: intake._id } : "skip",
  ) as Doc<"allergies">[] | undefined;

  const encounters = useQuery(
    api.modules.telehealth.encounters.listByPatient,
    intake?._id ? { patientId: intake._id } : "skip",
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

  const displayName = useMemo(() => {
    const fromIntake = intake ? `${intake.firstName} ${intake.lastName}`.trim() : "";
    if (fromIntake) return fromIntake;
    if (user?.name) return user.name;
    return user?.email ?? "Patient";
  }, [intake, user?.email, user?.name]);

  const upcomingAppointments = useMemo(() => {
    const list = appointments ?? [];
    return list
      .filter((apt) => apt.status === "upcoming" || apt.status === "unconfirmed")
      .sort((a, b) => a.scheduledAt - b.scheduledAt);
  }, [appointments]);

  if (!patientId) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <Card>
          <CardContent className="p-8 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto text-destructive mb-4" />
            <p className="text-muted-foreground">Invalid patient ID</p>
            <Button className="mt-4" onClick={() => navigate(-1)}>
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (user === undefined || intake === undefined || appointments === undefined) {
    return <FullPageSpinner />;
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <Card>
          <CardContent className="p-8 text-center">
            <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Patient not found</p>
            <Button className="mt-4" onClick={() => navigate(-1)}>
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold truncate">{displayName}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <Badge variant={user.isActive ? "secondary" : "outline"}>
                {user.isActive ? "Active" : "Inactive"}
              </Badge>
              <Badge variant={intake?.intakeCompleted ? "default" : "outline"}>
                {intake?.intakeCompleted ? "Intake Complete" : "Intake Pending"}
              </Badge>
              <span className="text-xs text-muted-foreground">
                Joined {format(new Date(user.createdAt), "MMM d, yyyy")}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            onClick={() => navigate(`/provider/patients/${user._id}/chart`)}
          >
            <FileText className="h-4 w-4 mr-2" />
            Open Chart
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{upcomingAppointments.length}</p>
                <p className="text-sm text-muted-foreground">Upcoming</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <Heart className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {conditions?.filter((c) => c.status === "active").length ?? 0}
                </p>
                <p className="text-sm text-muted-foreground">Active Conditions</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <Pill className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {medications?.filter((m) => m.status === "active").length ?? 0}
                </p>
                <p className="text-sm text-muted-foreground">Active Medications</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{allergies?.length ?? 0}</p>
                <p className="text-sm text-muted-foreground">Allergies</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="intake">Intake</TabsTrigger>
          <TabsTrigger value="emr">EMR</TabsTrigger>
          <TabsTrigger value="appointments">
            Appointments ({appointments?.length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="encounters">
            Encounters ({encounters?.length ?? 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Contact</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{user.email}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{intake?.phone || "Not provided"}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">
                  {intake?.street
                    ? `${intake.street}${intake.aptSuiteUnit ? `, ${intake.aptSuiteUnit}` : ""}, ${intake.city ?? ""} ${intake.state ?? ""} ${intake.zipCode ?? ""}`.trim()
                    : "Not provided"}
                </span>
              </div>
            </CardContent>
          </Card>

          {upcomingAppointments[0] && (
            <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-900/40">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-blue-700 dark:text-blue-300" />
                  <div className="min-w-0">
                    <p className="font-medium text-blue-900 dark:text-blue-100 truncate">
                      Next appointment:{" "}
                      {format(
                        new Date(upcomingAppointments[0].scheduledAt),
                        "MMM d, yyyy 'at' h:mm a",
                      )}
                    </p>
                    <p className="text-sm text-blue-800 dark:text-blue-200 truncate">
                      {upcomingAppointments[0].reasonForVisit}
                    </p>
                  </div>
                  <div className="ml-auto">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        navigate(`/call/${upcomingAppointments[0].cometChatSessionId}`)
                      }
                    >
                      Join
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="intake" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Intake Summary</CardTitle>
            </CardHeader>
            <CardContent>
              {!intake ? (
                <p className="text-sm text-muted-foreground">No intake started.</p>
              ) : (
                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="space-y-2">
                    <p className="text-sm font-semibold flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Personal
                    </p>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>
                        <span className="text-foreground">DOB:</span>{" "}
                        {intake.dateOfBirth || "—"}
                      </p>
                      <p>
                        <span className="text-foreground">Sex at birth:</span>{" "}
                        {intake.sexAtBirth || "—"}
                      </p>
                      <p>
                        <span className="text-foreground">Language:</span>{" "}
                        {intake.preferredLanguage || "—"}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-semibold flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Insurance
                    </p>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>
                        <span className="text-foreground">Provider:</span>{" "}
                        {intake.insuranceProvider || "—"}
                      </p>
                      <p>
                        <span className="text-foreground">Policy #:</span>{" "}
                        {intake.policyNumber || "—"}
                      </p>
                      <p>
                        <span className="text-foreground">Group #:</span>{" "}
                        {intake.groupNumber || "—"}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="emr" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Medical History</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-3">
                <div className="space-y-2">
                  <p className="text-sm font-semibold">Conditions</p>
                  {conditions === undefined ? (
                    <p className="text-sm text-muted-foreground">Loading…</p>
                  ) : conditions.length > 0 ? (
                    <div className="space-y-2">
                      {conditions.slice(0, 6).map((c) => (
                        <div key={c._id} className="text-sm">
                          <p className="font-medium">{c.conditionName}</p>
                          <p className="text-muted-foreground">
                            {c.status}
                            {c.dateOfOnset ? ` • Onset ${c.dateOfOnset}` : ""}
                          </p>
                        </div>
                      ))}
                      {conditions.length > 6 && (
                        <p className="text-sm text-muted-foreground">
                          +{conditions.length - 6} more
                        </p>
                      )}
                    </div>
                  ) : intake?.medicalConditions && intake.medicalConditions.length > 0 ? (
                    <div className="space-y-2">
                      {intake.medicalConditions.slice(0, 6).map((c, index) => (
                        <div key={`${c.name}-${index}`} className="text-sm">
                          <p className="font-medium">{c.name}</p>
                          <p className="text-muted-foreground">
                            {c.status === "managed" ? "chronic" : (c.status ?? "active")}
                            {c.onsetDate ? ` • Onset ${c.onsetDate}` : ""}
                          </p>
                        </div>
                      ))}
                      {intake.medicalConditions.length > 6 && (
                        <p className="text-sm text-muted-foreground">
                          +{intake.medicalConditions.length - 6} more
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">None recorded</p>
                  )}
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-semibold">Medications</p>
                  {medications === undefined ? (
                    <p className="text-sm text-muted-foreground">Loading…</p>
                  ) : medications.length > 0 ? (
                    <div className="space-y-2">
                      {medications.slice(0, 6).map((m) => (
                        <div key={m._id} className="text-sm">
                          <p className="font-medium">{m.medicationName}</p>
                          <p className="text-muted-foreground">
                            {m.dosage} • {m.frequency}
                          </p>
                        </div>
                      ))}
                      {medications.length > 6 && (
                        <p className="text-sm text-muted-foreground">
                          +{medications.length - 6} more
                        </p>
                      )}
                    </div>
                  ) : intake?.medications && intake.medications.length > 0 ? (
                    <div className="space-y-2">
                      {intake.medications.slice(0, 6).map((m, index) => (
                        <div key={`${m.name}-${index}`} className="text-sm">
                          <p className="font-medium">{m.name}</p>
                          <p className="text-muted-foreground">
                            {m.dosage || "Unknown"}
                            {m.frequency ? ` • ${m.frequency.replaceAll("_", " ")}` : ""}
                          </p>
                        </div>
                      ))}
                      {intake.medications.length > 6 && (
                        <p className="text-sm text-muted-foreground">
                          +{intake.medications.length - 6} more
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">None recorded</p>
                  )}
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-semibold">Allergies</p>
                  {allergies === undefined ? (
                    <p className="text-sm text-muted-foreground">Loading…</p>
                  ) : allergies.length > 0 ? (
                    <div className="space-y-2">
                      {allergies.slice(0, 6).map((a) => (
                        <div key={a._id} className="text-sm">
                          <p className="font-medium">{a.allergenName}</p>
                          <p className="text-muted-foreground">
                            {a.severity} • {a.reactionType}
                          </p>
                        </div>
                      ))}
                      {allergies.length > 6 && (
                        <p className="text-sm text-muted-foreground">
                          +{allergies.length - 6} more
                        </p>
                      )}
                    </div>
                  ) : intake?.allergies && intake.allergies.length > 0 ? (
                    <div className="space-y-2">
                      {intake.allergies.slice(0, 6).map((a, index) => (
                        <div key={`${a.allergen}-${index}`} className="text-sm">
                          <p className="font-medium">{a.allergen}</p>
                          <p className="text-muted-foreground">
                            {a.severity}
                            {a.reaction ? ` • ${a.reaction}` : ""}
                          </p>
                        </div>
                      ))}
                      {intake.allergies.length > 6 && (
                        <p className="text-sm text-muted-foreground">
                          +{intake.allergies.length - 6} more
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">None recorded</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appointments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Appointments</CardTitle>
            </CardHeader>
            <CardContent>
              {!appointments || appointments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No appointments found
                </p>
              ) : (
                <div className="space-y-3">
                  {appointments
                    .slice()
                    .sort((a, b) => b.scheduledAt - a.scheduledAt)
                    .slice(0, 20)
                    .map((apt) => (
                      <div
                        key={apt._id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <Badge variant={apt.status === "completed" ? "secondary" : "outline"}>
                              {apt.status}
                            </Badge>
                            <span className="text-sm text-muted-foreground truncate">
                              {format(new Date(apt.scheduledAt), "MMM d, yyyy 'at' h:mm a")}
                            </span>
                          </div>
                          <p className="font-medium mt-1 truncate">{apt.reasonForVisit}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate(`/call/${apt.cometChatSessionId}`)}
                          >
                            Join
                          </Button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="encounters" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Encounters</CardTitle>
            </CardHeader>
            <CardContent>
              {!encounters || encounters.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No encounters recorded
                </p>
              ) : (
                <div className="space-y-3">
                  {encounters.slice(0, 20).map((encounter) => (
                    <div
                      key={encounter._id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              encounter.status === "finalized" ? "secondary" : "default"
                            }
                          >
                            {encounter.status}
                          </Badge>
                          <span className="text-sm text-muted-foreground truncate">
                            {encounter.encounterDate}
                          </span>
                        </div>
                        <p className="font-medium mt-1 truncate">
                          {encounter.chiefComplaint || "No chief complaint"}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate(`/provider/encounter/${encounter._id}`)}
                      >
                        View
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
