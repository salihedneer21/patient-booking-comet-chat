import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Doc, Id } from "../../../../../convex/_generated/dataModel";
import { useCurrentUser } from "@/lib/useCurrentUser";
import FullPageSpinner from "@/components/ui/FullPageSpinner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  ArrowLeft,
  Calendar,
  CheckCircle,
  Clock,
  Search,
  User,
  UserCheck,
  Video,
  X,
} from "lucide-react";
import { format, isToday, isTomorrow } from "date-fns";
import toast from "react-hot-toast";

type AppointmentDoc = Doc<"appointments">;

type PatientListItem = {
  user: Doc<"users">;
  intake: {
    _id: Id<"patientIntake">;
    firstName: string;
    lastName: string;
    intakeCompleted: boolean;
  } | null;
};

type ProviderListItem = {
  user: Doc<"users">;
  profile: {
    _id: Id<"providerProfiles">;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
};

type AppointmentStatus =
  | "upcoming"
  | "unconfirmed"
  | "rescheduled"
  | "completed"
  | "canceled";

export default function AdminAppointmentsPage() {
  const navigate = useNavigate();
  const { user, isLoading: userLoading } = useCurrentUser();

  const [searchQuery, setSearchQuery] = useState("");
  const [cancelDialog, setCancelDialog] = useState<{
    open: boolean;
    appointmentId: Id<"appointments"> | null;
  }>({ open: false, appointmentId: null });
  const [cancelReason, setCancelReason] = useState("");
  const [isCanceling, setIsCanceling] = useState(false);
  const [isConfirming, setIsConfirming] = useState<Id<"appointments"> | null>(null);

  const appointments = useQuery(
    api.modules.telehealth.appointments.listAll,
    user?._id ? {} : "skip",
  ) as AppointmentDoc[] | undefined;

  const patientsData = useQuery(
    api.modules.telehealth.superAdmin.listAllPatients,
    user?._id ? { includeInactive: true } : "skip",
  ) as PatientListItem[] | undefined;

  const providersData = useQuery(
    api.modules.telehealth.superAdmin.listAllProviders,
    user?._id ? { includeInactive: true } : "skip",
  ) as ProviderListItem[] | undefined;

  const cancelAppointment = useMutation(api.modules.telehealth.appointments.cancel);
  const confirmAppointment = useMutation(api.modules.telehealth.appointments.confirm);

  const patientNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of patientsData ?? []) {
      const nameFromIntake = item.intake
        ? `${item.intake.firstName} ${item.intake.lastName}`.trim()
        : "";
      const name = nameFromIntake || item.user.name || item.user.email || "Patient";
      map.set(item.user._id, name);
    }
    return map;
  }, [patientsData]);

  const providerNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of providersData ?? []) {
      const nameFromProfile = item.profile
        ? `${item.profile.firstName} ${item.profile.lastName}`.trim()
        : "";
      const name = nameFromProfile
        ? `Dr. ${nameFromProfile}`
        : item.user.name || item.user.email || "Provider";
      map.set(item.user._id, name);
    }
    return map;
  }, [providersData]);

  const counts = useMemo(() => {
    const list = appointments ?? [];
    const base = {
      upcoming: 0,
      unconfirmed: 0,
      completed: 0,
      canceled: 0,
      rescheduled: 0,
    };
    for (const apt of list) {
      if (apt.status in base) {
        base[apt.status as keyof typeof base] += 1;
      }
    }
    return base;
  }, [appointments]);

  const canJoinCall = (scheduledAt: number) => {
    const now = Date.now();
    const fifteenMinutesBefore = scheduledAt - 15 * 60 * 1000;
    return now >= fifteenMinutesBefore;
  };

  const getStatusBadge = (status: AppointmentStatus) => {
    const styles: Record<AppointmentStatus, string> = {
      upcoming: "bg-green-100 text-green-800",
      unconfirmed: "bg-yellow-100 text-yellow-800",
      rescheduled: "bg-blue-100 text-blue-800",
      completed: "bg-gray-100 text-gray-800",
      canceled: "bg-red-100 text-red-800",
    };
    return <Badge className={styles[status]}>{status}</Badge>;
  };

  const filterAppointments = (status: AppointmentStatus | "today" | "past") => {
    const list = appointments ?? [];

    const byStatus =
      status === "past"
        ? list.filter((a) => a.status === "completed" || a.status === "canceled")
        : status === "today"
          ? list.filter((a) => a.status === "upcoming" && isToday(new Date(a.scheduledAt)))
          : list.filter((a) => a.status === status);

    const query = searchQuery.trim().toLowerCase();
    if (!query) return byStatus;

    return byStatus.filter((a) => {
      const patientName = patientNameById.get(a.patientId) ?? "";
      const providerName = providerNameById.get(a.providerId) ?? "";
      return (
        a.reasonForVisit.toLowerCase().includes(query) ||
        patientName.toLowerCase().includes(query) ||
        providerName.toLowerCase().includes(query)
      );
    });
  };

  const handleConfirm = async (appointmentId: Id<"appointments">) => {
    setIsConfirming(appointmentId);
    try {
      await confirmAppointment({ appointmentId });
      toast.success("Appointment confirmed");
    } catch {
      toast.error("Failed to confirm appointment");
    } finally {
      setIsConfirming(null);
    }
  };

  const handleCancel = async () => {
    if (!cancelDialog.appointmentId || !user) return;
    setIsCanceling(true);
    try {
      await cancelAppointment({
        appointmentId: cancelDialog.appointmentId,
        canceledBy: user._id,
        cancelReason: cancelReason || undefined,
      });
      toast.success("Appointment canceled");
      setCancelDialog({ open: false, appointmentId: null });
      setCancelReason("");
    } catch {
      toast.error("Failed to cancel appointment");
    } finally {
      setIsCanceling(false);
    }
  };

  if (userLoading || appointments === undefined || patientsData === undefined || providersData === undefined) {
    return <FullPageSpinner />;
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Appointments</h1>
          <p className="text-muted-foreground">
            Manage platform-wide appointments
          </p>
        </div>
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <Tabs defaultValue="upcoming" className="space-y-4">
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="upcoming">Upcoming ({counts.upcoming})</TabsTrigger>
          <TabsTrigger value="unconfirmed">Unconfirmed ({counts.unconfirmed})</TabsTrigger>
          <TabsTrigger value="today">Today</TabsTrigger>
          <TabsTrigger value="past">Past</TabsTrigger>
        </TabsList>

        {(["upcoming", "unconfirmed", "today", "past"] as const).map((tab) => {
          const list = filterAppointments(tab);
          const sorted = list
            .slice()
            .sort((a, b) =>
              tab === "past" ? b.scheduledAt - a.scheduledAt : a.scheduledAt - b.scheduledAt,
            );

          return (
            <TabsContent key={tab} value={tab} className="space-y-4">
              {sorted.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No appointments found</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {sorted.slice(0, 50).map((apt) => {
                    const patientName = patientNameById.get(apt.patientId) ?? "Patient";
                    const providerName = providerNameById.get(apt.providerId) ?? "Provider";
                    const status = apt.status as AppointmentStatus;

                    return (
                      <Card key={apt._id}>
                        <CardContent className="p-4">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="min-w-0 space-y-2">
                              <div className="flex flex-wrap items-center gap-2">
                                {getStatusBadge(status)}
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <Clock className="h-4 w-4" />
                                  <span>
                                    {format(new Date(apt.scheduledAt), "MMM d, yyyy 'at' h:mm a")}
                                  </span>
                                  {isTomorrow(new Date(apt.scheduledAt)) ? (
                                    <Badge variant="secondary">Tomorrow</Badge>
                                  ) : null}
                                  {isToday(new Date(apt.scheduledAt)) ? (
                                    <Badge variant="secondary">Today</Badge>
                                  ) : null}
                                </div>
                              </div>

                              <div className="flex flex-wrap items-center gap-3 text-sm">
                                <div className="flex items-center gap-2 min-w-0">
                                  <User className="h-4 w-4 text-muted-foreground" />
                                  <button
                                    className="truncate underline-offset-2 hover:underline"
                                    onClick={() => navigate(`/admin/patients/${apt.patientId}`)}
                                  >
                                    {patientName}
                                  </button>
                                </div>
                                <div className="flex items-center gap-2 min-w-0">
                                  <UserCheck className="h-4 w-4 text-muted-foreground" />
                                  <button
                                    className="truncate underline-offset-2 hover:underline"
                                    onClick={() => navigate(`/admin/providers/${apt.providerId}`)}
                                  >
                                    {providerName}
                                  </button>
                                </div>
                              </div>

                              <div className="text-sm">
                                <p className="font-medium truncate">{apt.reasonForVisit}</p>
                                <p className="text-muted-foreground truncate">
                                  {apt.durationMinutes} min • {apt.timezone}
                                </p>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                              {apt.status === "unconfirmed" ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleConfirm(apt._id)}
                                  disabled={isConfirming === apt._id}
                                >
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  {isConfirming === apt._id ? "Confirming…" : "Confirm"}
                                </Button>
                              ) : null}

                              {apt.status === "upcoming" && canJoinCall(apt.scheduledAt) ? (
                                <Button
                                  size="sm"
                                  onClick={() => navigate(`/call/${apt.cometChatSessionId}`)}
                                >
                                  <Video className="h-4 w-4 mr-2" />
                                  Join
                                </Button>
                              ) : null}

                              {apt.status === "upcoming" || apt.status === "unconfirmed" ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    setCancelDialog({ open: true, appointmentId: apt._id })
                                  }
                                >
                                  <X className="h-4 w-4 mr-2" />
                                  Cancel
                                </Button>
                              ) : null}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          );
        })}
      </Tabs>

      {/* Cancel Dialog */}
      <Dialog
        open={cancelDialog.open}
        onOpenChange={(open) => {
          if (!open) {
            setCancelDialog({ open: false, appointmentId: null });
            setCancelReason("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Appointment</DialogTitle>
            <DialogDescription>
              This will cancel the appointment and prevent joining the session link.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-sm font-medium">Reason (optional)</p>
            <Textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Reason for canceling…"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCancelDialog({ open: false, appointmentId: null })}
              disabled={isCanceling}
            >
              Keep
            </Button>
            <Button variant="destructive" onClick={handleCancel} disabled={isCanceling}>
              {isCanceling ? "Canceling…" : "Cancel appointment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
