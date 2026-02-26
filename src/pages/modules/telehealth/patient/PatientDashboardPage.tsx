import { useNavigate } from "react-router-dom";
import { useQuery } from "convex/react";
import { useEffect } from "react";
import { api } from "../../../../../convex/_generated/api";
import type { Doc } from "../../../../../convex/_generated/dataModel";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { useNow } from "@/lib/useNow";
import FullPageSpinner from "@/components/ui/FullPageSpinner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  MessageSquare,
  FileText,
  User,
  HelpCircle,
  Video,
  Clock,
  ArrowRight,
} from "lucide-react";
import { format } from "date-fns";

export default function PatientDashboardPage() {
  const navigate = useNavigate();
  const { user, isLoading: userLoading } = useCurrentUser();
  const now = useNow({ intervalMs: 30_000 });

  const intake = useQuery(
    api.modules.telehealth.patientIntake.getMyIntake,
    user?._id ? { userId: user._id } : "skip"
  ) as Doc<"patientIntake"> | null | undefined;

  const appointments = useQuery(
    api.modules.telehealth.appointments.getByPatient,
    user?._id ? { patientId: user._id, status: "upcoming" } : "skip"
  ) as Doc<"appointments">[] | undefined;

  const unreadNotifications = useQuery(
    api.modules.telehealth.notifications.getUnreadCount,
    user?._id ? { userId: user._id } : "skip"
  ) as number | undefined;

  useEffect(() => {
    if (intake && !intake.intakeCompleted) {
      navigate("/intake", { replace: true });
    }
  }, [intake, navigate]);

  if (userLoading || intake === undefined) {
    return <FullPageSpinner />;
  }

  // Redirect to intake if not completed
  if (intake && !intake.intakeCompleted) {
    return <FullPageSpinner />;
  }

  const upcomingAppointments = appointments || [];
  const nextAppointments = upcomingAppointments
    .sort((a, b) => a.scheduledAt - b.scheduledAt)
    .slice(0, 3);

  const quickActions = [
    {
      title: "Book Appointment",
      description: "Schedule a visit with a provider",
      icon: Calendar,
      href: "/patient/schedule",
      color: "text-blue-600",
    },
    {
      title: "Messages",
      description: "View your conversations",
      icon: MessageSquare,
      href: "/patient/messages",
      color: "text-green-600",
      badge: unreadNotifications && unreadNotifications > 0 ? unreadNotifications : undefined,
    },
    {
      title: "Health Records",
      description: "View your medical history",
      icon: FileText,
      href: "/patient/health",
      color: "text-purple-600",
    },
    {
      title: "My Profile",
      description: "Update your information",
      icon: User,
      href: "/patient/profile",
      color: "text-orange-600",
    },
    {
      title: "Support",
      description: "Get help and FAQs",
      icon: HelpCircle,
      href: "/patient/support",
      color: "text-gray-600",
    },
  ];

  const canJoinCall = (scheduledAt: number) => {
    const fifteenMinutesBefore = scheduledAt - 15 * 60 * 1000;
    return now >= fifteenMinutesBefore;
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Welcome Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">
          Welcome back, {intake?.firstName || user?.name || "Patient"}!
        </h1>
        <p className="text-muted-foreground mt-1">
          Here's what's happening with your health today
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Quick Actions */}
        <div className="lg:col-span-2">
          <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {quickActions.map((action) => (
              <Card
                key={action.title}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate(action.href)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg bg-muted ${action.color}`}>
                      <action.icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium truncate">{action.title}</h3>
                        {action.badge && (
                          <Badge variant="destructive" className="text-xs">
                            {action.badge}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {action.description}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Upcoming Appointments */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Upcoming Appointments</h2>
            <Button
              variant="link"
              className="text-sm p-0 h-auto"
              onClick={() => navigate("/patient/bookings")}
            >
              View All
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>

          {nextAppointments.length > 0 ? (
            <div className="space-y-3">
              {nextAppointments.map((appointment) => (
                <Card key={appointment._id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {appointment.reasonForVisit}
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                          <Clock className="w-4 h-4" />
                          <span>
                            {format(new Date(appointment.scheduledAt), "MMM d, h:mm a")}
                          </span>
                        </div>
                      </div>
                      {canJoinCall(appointment.scheduledAt) && (
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/call/${appointment.cometChatSessionId}`);
                          }}
                        >
                          <Video className="w-4 h-4 mr-1" />
                          Join
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-6 text-center">
                <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground mb-4">
                  No upcoming appointments
                </p>
                <Button onClick={() => navigate("/patient/schedule")}>
                  Book Appointment
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
