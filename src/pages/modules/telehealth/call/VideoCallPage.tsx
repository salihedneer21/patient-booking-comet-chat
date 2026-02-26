import { useCallback, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { useNow } from "@/lib/useNow";
import { useCometChat } from "@/components/modules/telehealth/shared/cometchat";
import FullPageSpinner from "@/components/ui/FullPageSpinner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { WaitingRoom, VideoCallRoom } from "@/components/modules/telehealth/shared/video";

export default function VideoCallPage() {
  const navigate = useNavigate();
  const { sessionId } = useParams<{ sessionId: string }>();
  const { user, isLoading: userLoading } = useCurrentUser();
  const { isInitialized, isLoggedIn, error: cometChatError } = useCometChat();
  const now = useNow({ intervalMs: 1000 });

  const [hasJoined, setHasJoined] = useState(false);

  const appointment = useQuery(
    api.modules.telehealth.appointments.getBySessionId,
    sessionId ? { sessionId } : "skip",
  );

  const patientJoined = useMutation(api.modules.telehealth.appointments.patientJoined);
  const providerJoined = useMutation(api.modules.telehealth.appointments.providerJoined);
  const completeAppointment = useMutation(api.modules.telehealth.appointments.complete);

  const otherPartyProfile = useQuery(
    api.modules.telehealth.providers.getByUserId,
    appointment && user && appointment.patientId === user._id
      ? { userId: appointment.providerId }
      : "skip",
  );

  const otherPartyIntake = useQuery(
    api.modules.telehealth.patientIntake.getByUserId,
    appointment && user && appointment.providerId === user._id
      ? { userId: appointment.patientId }
      : "skip",
  );

  const otherPartyName = useMemo(() => {
    if (otherPartyIntake) {
      const name = `${otherPartyIntake.firstName} ${otherPartyIntake.lastName}`.trim();
      if (name) return name;
    }
    if (otherPartyProfile) {
      const name = `${otherPartyProfile.firstName} ${otherPartyProfile.lastName}`.trim();
      if (name) return `Dr. ${name}`;
    }
    return "Participant";
  }, [otherPartyIntake, otherPartyProfile]);

  const joinAvailableAt = useMemo(() => {
    if (!appointment) return null;
    return appointment.scheduledAt - 15 * 60 * 1000;
  }, [appointment]);

  const canJoin = useMemo(() => {
    if (!appointment || joinAvailableAt === null) return false;
    if (appointment.status !== "upcoming") return false;
    return now >= joinAvailableAt;
  }, [appointment, joinAvailableAt, now]);

  const handleJoin = useCallback(async () => {
    if (!appointment || !user || !sessionId) return;
    setHasJoined(true);

    // Best-effort join tracking
    try {
      if (user._id === appointment.patientId) {
        await patientJoined({ appointmentId: appointment._id });
      } else if (user._id === appointment.providerId) {
        await providerJoined({ appointmentId: appointment._id });
      }
    } catch (e) {
      console.warn("Failed to record join time:", e);
    }
  }, [appointment, patientJoined, providerJoined, sessionId, user]);

  const handleCallEnded = useCallback(async () => {
    if (!appointment || !user) {
      navigate(-1);
      return;
    }

    // Mark completed when provider ends/leaves the call.
    if (user._id === appointment.providerId && appointment.status === "upcoming") {
      try {
        await completeAppointment({ appointmentId: appointment._id });
      } catch (e) {
        console.warn("Failed to mark appointment completed:", e);
      }
    }

    navigate(-1);
  }, [appointment, completeAppointment, navigate, user]);

  if (userLoading || appointment === undefined) {
    return <FullPageSpinner />;
  }

  if (!sessionId) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <Card>
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
            <h2 className="text-xl font-semibold mb-2">Invalid session</h2>
            <Button className="mt-2" onClick={() => navigate(-1)}>
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <Card>
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
            <h2 className="text-xl font-semibold mb-2">Appointment not found</h2>
            <p className="text-muted-foreground">
              This session link may be invalid or expired.
            </p>
            <Button className="mt-4" onClick={() => navigate(-1)}>
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Participant check
  const isParticipant =
    !!user &&
    (user._id === appointment.patientId || user._id === appointment.providerId);

  if (!isParticipant) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <Card>
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
            <h2 className="text-xl font-semibold mb-2">Access denied</h2>
            <p className="text-muted-foreground">
              You are not a participant in this appointment.
            </p>
            <Button className="mt-4" onClick={() => navigate(-1)}>
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isInitialized || cometChatError) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <Card>
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
            <h2 className="text-xl font-semibold mb-2">Video unavailable</h2>
            <p className="text-muted-foreground">
              {cometChatError || "Failed to initialize CometChat."}
            </p>
            <Button className="mt-4" onClick={() => navigate(-1)}>
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isLoggedIn) {
    return <FullPageSpinner />;
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-background px-4 py-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold truncate">Video Session</h1>
            <p className="text-sm text-muted-foreground truncate">
              {appointment.reasonForVisit}
            </p>
          </div>
        </div>

        {hasJoined ? (
          <Card className="overflow-hidden">
            <CardContent className="p-0 h-[70vh]">
              <VideoCallRoom sessionId={sessionId} onCallEnded={handleCallEnded} />
            </CardContent>
          </Card>
        ) : (
          <WaitingRoom
            otherPartyName={otherPartyName}
            scheduledAt={appointment.scheduledAt}
            durationMinutes={appointment.durationMinutes}
            reasonForVisit={appointment.reasonForVisit}
            status={appointment.status}
            canJoin={canJoin}
            joinAvailableAt={joinAvailableAt ?? appointment.scheduledAt}
            onJoin={handleJoin}
          />
        )}
      </div>
    </div>
  );
}
