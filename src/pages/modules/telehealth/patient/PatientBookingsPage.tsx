import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Doc, Id } from "../../../../../convex/_generated/dataModel";
import { useCurrentUser } from "@/lib/useCurrentUser";
import FullPageSpinner from "@/components/ui/FullPageSpinner";
import { Card, CardContent } from "@/components/ui/card";
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
import { Calendar, Clock, Video, X } from "lucide-react";
import { format } from "date-fns";
import toast from "react-hot-toast";

type AppointmentStatus =
  | "upcoming"
  | "unconfirmed"
  | "rescheduled"
  | "completed"
  | "canceled";

export default function PatientBookingsPage() {
  const navigate = useNavigate();
  const { user, isLoading: userLoading } = useCurrentUser();
  const [cancelDialog, setCancelDialog] = useState<{
    open: boolean;
    appointmentId: Id<"appointments"> | null;
  }>({
    open: false,
    appointmentId: null,
  });
  const [cancelReason, setCancelReason] = useState("");
  const [isCanceling, setIsCanceling] = useState(false);

  const appointments = useQuery(
    api.modules.telehealth.appointments.getByPatient,
    user?._id ? { patientId: user._id } : "skip"
  ) as Doc<"appointments">[] | undefined;

  const cancelAppointment = useMutation(api.modules.telehealth.appointments.cancel);

  if (userLoading || appointments === undefined) {
    return <FullPageSpinner />;
  }

  const filterByStatus = (status: AppointmentStatus | "past") => {
    if (!appointments) return [];
    if (status === "past") {
      return appointments.filter(
        (a) => a.status === "completed" || a.status === "canceled"
      );
    }
    return appointments.filter((a) => a.status === status);
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

  const canJoinCall = (scheduledAt: number) => {
    const now = Date.now();
    const fifteenMinutesBefore = scheduledAt - 15 * 60 * 1000;
    return now >= fifteenMinutesBefore;
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

  const AppointmentCard = ({ appointment }: { appointment: Doc<"appointments"> }) => (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              {getStatusBadge(appointment.status as AppointmentStatus)}
            </div>
            <p className="font-medium">{appointment.reasonForVisit}</p>
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                <span>{format(new Date(appointment.scheduledAt), "MMM d, yyyy")}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                <span>{format(new Date(appointment.scheduledAt), "h:mm a")}</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Duration: {appointment.durationMinutes} minutes
            </p>
          </div>
          <div className="flex flex-col gap-2">
            {appointment.status === "upcoming" && (
              <>
                {canJoinCall(appointment.scheduledAt) && (
                  <Button
                    size="sm"
                    onClick={() => navigate(`/call/${appointment.cometChatSessionId}`)}
                  >
                    <Video className="w-4 h-4 mr-1" />
                    Join Call
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setCancelDialog({ open: true, appointmentId: appointment._id })
                  }
                >
                  <X className="w-4 h-4 mr-1" />
                  Cancel
                </Button>
              </>
            )}
            {appointment.status === "unconfirmed" && (
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setCancelDialog({ open: true, appointmentId: appointment._id })
                }
              >
                Cancel
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">My Appointments</h1>
          <p className="text-muted-foreground">View and manage your bookings</p>
        </div>
        <Button onClick={() => navigate("/patient/schedule")}>
          Book Appointment
        </Button>
      </div>

      <Tabs defaultValue="upcoming" className="space-y-4">
        <TabsList>
          <TabsTrigger value="upcoming">
            Upcoming ({filterByStatus("upcoming").length})
          </TabsTrigger>
          <TabsTrigger value="unconfirmed">
            Unconfirmed ({filterByStatus("unconfirmed").length})
          </TabsTrigger>
          <TabsTrigger value="past">
            Past ({filterByStatus("past").length})
          </TabsTrigger>
        </TabsList>

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
                <p className="text-muted-foreground mb-4">No upcoming appointments</p>
                <Button onClick={() => navigate("/patient/schedule")}>
                  Book Appointment
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="unconfirmed" className="space-y-4">
          {filterByStatus("unconfirmed").length > 0 ? (
            filterByStatus("unconfirmed").map((appointment) => (
              <AppointmentCard key={appointment._id} appointment={appointment} />
            ))
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground">No unconfirmed appointments</p>
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
              Are you sure you want to cancel this appointment? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Reason (optional)</label>
              <Textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Let us know why you're canceling..."
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
