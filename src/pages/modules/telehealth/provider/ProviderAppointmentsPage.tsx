import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Doc, Id } from "../../../../../convex/_generated/dataModel";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { useNow } from "@/lib/useNow";
import FullPageSpinner from "@/components/ui/FullPageSpinner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
  Clock,
  Video,
  FileText,
  CheckCircle,
  X,
  User,
} from "lucide-react";
import { format, isToday, isTomorrow } from "date-fns";
import toast from "react-hot-toast";

type AppointmentStatus =
  | "upcoming"
  | "unconfirmed"
  | "rescheduled"
  | "completed"
  | "canceled";

export default function ProviderAppointmentsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get("filter") || "upcoming";
  const { user, isLoading: userLoading } = useCurrentUser();
  const now = useNow({ intervalMs: 30_000 });

  const [cancelDialog, setCancelDialog] = useState<{
    open: boolean;
    appointmentId: Id<"appointments"> | null;
  }>({ open: false, appointmentId: null });
  const [cancelReason, setCancelReason] = useState("");
  const [isCanceling, setIsCanceling] = useState(false);
  const [isConfirming, setIsConfirming] = useState<Id<"appointments"> | null>(null);

  const appointments = useQuery(
    api.modules.telehealth.appointments.getByProvider,
    user?._id ? { providerId: user._id } : "skip"
  ) as Doc<"appointments">[] | undefined;

  const cancelAppointment = useMutation(api.modules.telehealth.appointments.cancel);
  const confirmAppointment = useMutation(api.modules.telehealth.appointments.confirm);

  if (userLoading || appointments === undefined) {
    return <FullPageSpinner />;
  }

  const filterByStatus = (status: AppointmentStatus | "past" | "today") => {
    if (!appointments) return [];
    if (status === "past") {
      return appointments.filter(
        (a) => a.status === "completed" || a.status === "canceled"
      );
    }
    if (status === "today") {
      return appointments.filter(
        (a) => a.status === "upcoming" && isToday(new Date(a.scheduledAt))
      );
    }
    return appointments.filter((a) => a.status === status);
  };

  const canJoinCall = (scheduledAt: number) => {
    const fifteenMinutesBefore = scheduledAt - 15 * 60 * 1000;
    return now >= fifteenMinutesBefore;
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

  const getDateLabel = (scheduledAt: number) => {
    const date = new Date(scheduledAt);
    if (isToday(date)) return "Today";
    if (isTomorrow(date)) return "Tomorrow";
    return format(date, "MMM d, yyyy");
  };

  const AppointmentCard = ({ appointment }: { appointment: (typeof appointments)[0] }) => (
    <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-4">
        <Avatar className="h-10 w-10">
          <AvatarFallback>
            <User className="h-5 w-5" />
          </AvatarFallback>
        </Avatar>
        <div>
          <div className="flex items-center gap-2 mb-1">
            {getStatusBadge(appointment.status as AppointmentStatus)}
            <span className="text-sm text-muted-foreground">
              {getDateLabel(appointment.scheduledAt)}
            </span>
          </div>
          <p className="font-medium">{appointment.reasonForVisit}</p>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>{format(new Date(appointment.scheduledAt), "h:mm a")}</span>
            <span>•</span>
            <span>{appointment.durationMinutes} min</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {appointment.status === "unconfirmed" && (
          <>
            <Button
              size="sm"
              onClick={() => handleConfirm(appointment._id)}
              disabled={isConfirming === appointment._id}
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              {isConfirming === appointment._id ? "..." : "Confirm"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                setCancelDialog({ open: true, appointmentId: appointment._id })
              }
            >
              Decline
            </Button>
          </>
        )}
        {appointment.status === "upcoming" && (
          <>
            {canJoinCall(appointment.scheduledAt) && (
              <Button
                size="sm"
                onClick={() => navigate(`/call/${appointment.cometChatSessionId}`)}
              >
                <Video className="h-4 w-4 mr-1" />
                Join
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                navigate(`/provider/patients/${appointment.patientId}/chart`)
              }
            >
              <FileText className="h-4 w-4 mr-1" />
              Chart
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                setCancelDialog({ open: true, appointmentId: appointment._id })
              }
            >
              <X className="h-4 w-4" />
            </Button>
          </>
        )}
        {(appointment.status === "completed" || appointment.status === "canceled") && (
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              navigate(`/provider/patients/${appointment.patientId}/chart`)
            }
          >
            <FileText className="h-4 w-4 mr-1" />
            View Chart
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Appointments</h1>
          <p className="text-muted-foreground">
            Manage your patient appointments
          </p>
        </div>
      </div>

      <Tabs defaultValue={initialTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="today">
            Today ({filterByStatus("today").length})
          </TabsTrigger>
          <TabsTrigger value="upcoming">
            Upcoming ({filterByStatus("upcoming").length})
          </TabsTrigger>
          <TabsTrigger value="unconfirmed">
            Pending ({filterByStatus("unconfirmed").length})
          </TabsTrigger>
          <TabsTrigger value="past">
            Past ({filterByStatus("past").length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="today" className="space-y-4">
          {filterByStatus("today").length > 0 ? (
            filterByStatus("today")
              .sort((a, b) => a.scheduledAt - b.scheduledAt)
              .map((appointment) => (
                <AppointmentCard key={appointment._id} appointment={appointment} />
              ))
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  No appointments scheduled for today
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="upcoming" className="space-y-4">
          {filterByStatus("upcoming").length > 0 ? (
            filterByStatus("upcoming")
              .sort((a, b) => a.scheduledAt - b.scheduledAt)
              .map((appointment) => (
                <AppointmentCard key={appointment._id} appointment={appointment} />
              ))
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  No upcoming appointments
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="unconfirmed" className="space-y-4">
          {filterByStatus("unconfirmed").length > 0 ? (
            filterByStatus("unconfirmed")
              .sort((a, b) => a.scheduledAt - b.scheduledAt)
              .map((appointment) => (
                <AppointmentCard key={appointment._id} appointment={appointment} />
              ))
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
                <p className="text-muted-foreground">
                  No pending appointments to confirm
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="past" className="space-y-4">
          {filterByStatus("past").length > 0 ? (
            filterByStatus("past")
              .sort((a, b) => b.scheduledAt - a.scheduledAt)
              .map((appointment) => (
                <AppointmentCard key={appointment._id} appointment={appointment} />
              ))
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground">No past appointments</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
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
              Are you sure you want to cancel this appointment? The patient will
              be notified.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Reason (optional)</label>
              <Textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Provide a reason for cancellation..."
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCancelDialog({ open: false, appointmentId: null })}
              disabled={isCanceling}
            >
              Keep Appointment
            </Button>
            <Button variant="destructive" onClick={handleCancel} disabled={isCanceling}>
              {isCanceling ? "Canceling..." : "Cancel Appointment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
