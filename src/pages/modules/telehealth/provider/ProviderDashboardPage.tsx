import { useNavigate } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Doc } from "../../../../../convex/_generated/dataModel";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { useNow } from "@/lib/useNow";
import FullPageSpinner from "@/components/ui/FullPageSpinner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Calendar,
  Users,
  Clock,
  Video,
  MessageSquare,
  FileText,
  Settings,
  ArrowRight,
  AlertCircle,
  User,
} from "lucide-react";
import { format, isToday, isTomorrow } from "date-fns";

export default function ProviderDashboardPage() {
  const navigate = useNavigate();
  const { user, isLoading: userLoading } = useCurrentUser();
  const now = useNow({ intervalMs: 10_000 });

  const providerProfile = useQuery(
    api.modules.telehealth.providers.getByUserId,
    user?._id ? { userId: user._id } : "skip"
  ) as Doc<"providerProfiles"> | null | undefined;

  const appointments = useQuery(
    api.modules.telehealth.appointments.getByProvider,
    user?._id ? { providerId: user._id } : "skip"
  ) as Doc<"appointments">[] | undefined;

  const unconfirmedAppointments = useQuery(
    api.modules.telehealth.appointments.getByProvider,
    user?._id ? { providerId: user._id, status: "unconfirmed" } : "skip"
  ) as Doc<"appointments">[] | undefined;

  if (userLoading || providerProfile === undefined) {
    return <FullPageSpinner />;
  }

  // Redirect to profile setup if not completed
  if (!providerProfile) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <Card>
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-yellow-500 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Complete Your Profile</h2>
            <p className="text-muted-foreground mb-4">
              Please complete your provider profile to start seeing patients.
            </p>
            <Button onClick={() => navigate("/provider/profile")}>
              Complete Profile
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const upcomingAppointments = appointments
    ?.filter((a) => a.status === "upcoming")
    .sort((a, b) => a.scheduledAt - b.scheduledAt) || [];

  const todayAppointments = upcomingAppointments.filter((a) =>
    isToday(new Date(a.scheduledAt))
  );

  const tomorrowAppointments = upcomingAppointments.filter((a) =>
    isTomorrow(new Date(a.scheduledAt))
  );

  const canJoinCall = (scheduledAt: number) => {
    const fifteenMinutesBefore = scheduledAt - 15 * 60 * 1000;
    return now !== 0 && now >= fifteenMinutesBefore;
  };

  const quickActions = [
    {
      title: "My Patients",
      description: "View and manage patients",
      icon: Users,
      href: "/provider/patients",
      color: "text-blue-600",
    },
    {
      title: "Messages",
      description: "Patient conversations",
      icon: MessageSquare,
      href: "/provider/messages",
      color: "text-green-600",
    },
    {
      title: "Schedule",
      description: "Manage availability",
      icon: Calendar,
      href: "/provider/availability",
      color: "text-purple-600",
    },
    {
      title: "Settings",
      description: "Profile & preferences",
      icon: Settings,
      href: "/provider/profile",
      color: "text-gray-600",
    },
  ];

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Welcome Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">
          Welcome, Dr. {providerProfile.lastName}!
        </h1>
        <p className="text-muted-foreground mt-1">
          Here's your schedule for today
        </p>
      </div>

      {/* Unconfirmed Alert */}
      {unconfirmedAppointments && unconfirmedAppointments.length > 0 && (
        <Card className="mb-6 border-yellow-200 bg-yellow-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-600" />
                <div>
                  <p className="font-medium text-yellow-800">
                    {unconfirmedAppointments.length} appointment{unconfirmedAppointments.length > 1 ? "s" : ""} pending confirmation
                  </p>
                  <p className="text-sm text-yellow-700">
                    Review and confirm these appointments
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                className="border-yellow-300 text-yellow-800 hover:bg-yellow-100"
                onClick={() => navigate("/provider/appointments?filter=unconfirmed")}
              >
                Review
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Overview */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{todayAppointments.length}</p>
                <p className="text-sm text-muted-foreground">Today</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 text-green-600">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{tomorrowAppointments.length}</p>
                <p className="text-sm text-muted-foreground">Tomorrow</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-100 text-yellow-600">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{unconfirmedAppointments?.length || 0}</p>
                <p className="text-sm text-muted-foreground">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 text-purple-600">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{upcomingAppointments.length}</p>
                <p className="text-sm text-muted-foreground">This Week</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Today's Schedule */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Today's Schedule</CardTitle>
                  <CardDescription>
                    {format(new Date(), "EEEE, MMMM d, yyyy")}
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate("/provider/appointments")}
                >
                  View All
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {todayAppointments.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">
                    No appointments scheduled for today
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {todayAppointments.map((appointment) => (
                    <div
                      key={appointment._id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback>
                            <User className="h-5 w-5" />
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">Patient Appointment</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            <span>
                              {format(new Date(appointment.scheduledAt), "h:mm a")}
                            </span>
                            <span>•</span>
                            <span>{appointment.durationMinutes} min</span>
                          </div>
                          <p className="text-sm text-muted-foreground truncate max-w-xs">
                            {appointment.reasonForVisit}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
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
                          onClick={() => navigate(`/provider/patients/${appointment.patientId}/chart`)}
                        >
                          <FileText className="h-4 w-4 mr-1" />
                          Chart
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {quickActions.map((action) => (
                <div
                  key={action.title}
                  className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted transition-colors"
                  onClick={() => navigate(action.href)}
                >
                  <div className={`p-2 rounded-lg bg-muted ${action.color}`}>
                    <action.icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{action.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {action.description}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Tomorrow Preview */}
          {tomorrowAppointments.length > 0 && (
            <Card className="mt-4">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Tomorrow</CardTitle>
                <CardDescription className="text-xs">
                  {now === 0 ? "—" : format(new Date(now + 86400000), "EEEE, MMMM d")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {tomorrowAppointments.slice(0, 3).map((appointment) => (
                  <div
                    key={appointment._id}
                    className="flex items-center gap-2 text-sm"
                  >
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {format(new Date(appointment.scheduledAt), "h:mm a")}
                    </span>
                    <span className="text-muted-foreground">•</span>
                    <span className="truncate">{appointment.reasonForVisit}</span>
                  </div>
                ))}
                {tomorrowAppointments.length > 3 && (
                  <p className="text-xs text-muted-foreground">
                    +{tomorrowAppointments.length - 3} more
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
