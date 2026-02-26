import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "convex/react";
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
  Mail,
  Phone,
  Stethoscope,
} from "lucide-react";
import { format } from "date-fns";

export default function AdminProviderDetailPage() {
  const navigate = useNavigate();
  const { providerId } = useParams<{ providerId: string }>();

  const user = useQuery(
    api.users.getById,
    providerId ? { userId: providerId as Id<"users"> } : "skip",
  ) as Doc<"users"> | null | undefined;

  const profile = useQuery(
    api.modules.telehealth.providers.getMyProfile,
    providerId ? { userId: providerId as Id<"users"> } : "skip",
  ) as Doc<"providerProfiles"> | null | undefined;

  const availability = useQuery(
    api.modules.telehealth.availability.getMyAvailability,
    providerId ? { providerId: providerId as Id<"users"> } : "skip",
  ) as Doc<"providerAvailability">[] | undefined;

  const appointments = useQuery(
    api.modules.telehealth.appointments.getByProvider,
    providerId ? { providerId: providerId as Id<"users"> } : "skip",
  ) as Doc<"appointments">[] | undefined;

  const encounters = useQuery(
    api.modules.telehealth.encounters.listByProvider,
    providerId ? { providerId: providerId as Id<"users"> } : "skip",
  ) as Doc<"encounters">[] | undefined;

  const displayName = useMemo(() => {
    const fromProfile = profile ? `${profile.firstName} ${profile.lastName}`.trim() : "";
    if (fromProfile) return `Dr. ${fromProfile}`;
    if (user?.name) return user.name;
    return user?.email ?? "Provider";
  }, [profile, user?.email, user?.name]);

  const upcomingAppointments = useMemo(() => {
    const list = appointments ?? [];
    return list
      .filter((apt) => apt.status === "upcoming" || apt.status === "unconfirmed")
      .sort((a, b) => a.scheduledAt - b.scheduledAt);
  }, [appointments]);

  const activeSlots = useMemo(() => {
    return (availability ?? []).filter((s) => s.isActive);
  }, [availability]);

  const draftEncounters = useMemo(() => {
    return (encounters ?? []).filter((e) => e.status === "draft");
  }, [encounters]);

  if (!providerId) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <Card>
          <CardContent className="p-8 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto text-destructive mb-4" />
            <p className="text-muted-foreground">Invalid provider ID</p>
            <Button className="mt-4" onClick={() => navigate(-1)}>
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (
    user === undefined ||
    profile === undefined ||
    availability === undefined ||
    appointments === undefined ||
    encounters === undefined
  ) {
    return <FullPageSpinner />;
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <Card>
          <CardContent className="p-8 text-center">
            <Stethoscope className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Provider not found</p>
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
              <span className="text-xs text-muted-foreground">
                Joined {format(new Date(user.createdAt), "MMM d, yyyy")}
              </span>
            </div>
          </div>
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
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{draftEncounters.length}</p>
                <p className="text-sm text-muted-foreground">Draft Encounters</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <Stethoscope className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{encounters?.length ?? 0}</p>
                <p className="text-sm text-muted-foreground">Total Encounters</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeSlots.length}</p>
                <p className="text-sm text-muted-foreground">Active Slots</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="availability">
            Availability ({availability?.length ?? 0})
          </TabsTrigger>
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
                <span className="font-medium">{profile?.phone || "Not provided"}</span>
              </div>
              {profile?.bio && (
                <div className="pt-2">
                  <p className="text-sm font-semibold">Bio</p>
                  <p className="text-sm text-muted-foreground mt-1">{profile.bio}</p>
                </div>
              )}
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

        <TabsContent value="availability" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Weekly Availability</CardTitle>
            </CardHeader>
            <CardContent>
              {!availability || availability.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No availability configured
                </p>
              ) : (
                <div className="space-y-3">
                  {availability
                    .slice()
                    .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
                    .map((slot) => (
                      <div
                        key={slot._id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div>
                          <p className="font-medium">
                            Day {slot.dayOfWeek} • {slot.startTime} – {slot.endTime}
                          </p>
                          <p className="text-sm text-muted-foreground">{slot.timezone}</p>
                        </div>
                        <Badge variant={slot.isActive ? "secondary" : "outline"}>
                          {slot.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    ))}
                </div>
              )}
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
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(`/call/${apt.cometChatSessionId}`)}
                        >
                          Join
                        </Button>
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
