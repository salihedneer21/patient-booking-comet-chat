import { format } from "date-fns";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Video } from "lucide-react";

interface WaitingRoomProps {
  otherPartyName: string;
  scheduledAt: number;
  durationMinutes: number;
  reasonForVisit?: string;
  status: string;
  canJoin: boolean;
  joinAvailableAt: number;
  onJoin: () => void;
}

export function WaitingRoom({
  otherPartyName,
  scheduledAt,
  durationMinutes,
  reasonForVisit,
  status,
  canJoin,
  joinAvailableAt,
  onJoin,
}: WaitingRoomProps) {
  const statusLabel =
    status === "upcoming"
      ? "Upcoming"
      : status === "unconfirmed"
        ? "Unconfirmed"
        : status === "completed"
          ? "Completed"
          : status === "canceled"
            ? "Canceled"
            : status;

  return (
    <Card className="max-w-lg mx-auto">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <CardTitle className="truncate">Waiting Room</CardTitle>
            <CardDescription className="mt-1">
              Session with <span className="font-medium">{otherPartyName}</span>
            </CardDescription>
          </div>
          <Badge variant={status === "upcoming" ? "default" : "secondary"}>
            {statusLabel}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {reasonForVisit ? (
          <div>
            <p className="text-sm font-medium">Reason</p>
            <p className="text-sm text-muted-foreground">{reasonForVisit}</p>
          </div>
        ) : null}

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>
            {format(new Date(scheduledAt), "PPP p")} • {durationMinutes} min
          </span>
        </div>

        {!canJoin ? (
          <div className="rounded-lg border bg-muted/40 p-3 text-sm">
            Session will be available at{" "}
            <span className="font-medium">
              {format(new Date(joinAvailableAt), "p")}
            </span>{" "}
            (15 minutes before your appointment).
          </div>
        ) : null}

        {status !== "upcoming" ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            This appointment is not in an upcoming state. Joining is disabled.
          </div>
        ) : null}
      </CardContent>

      <CardFooter>
        <Button
          className="w-full"
          onClick={onJoin}
          disabled={!canJoin || status !== "upcoming"}
        >
          <Video className="h-4 w-4 mr-2" />
          Join Session
        </Button>
      </CardFooter>
    </Card>
  );
}

