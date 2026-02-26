import { useNavigate } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { useCurrentUser } from "@/lib/useCurrentUser";
import FullPageSpinner from "@/components/ui/FullPageSpinner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Users,
  UserCheck,
  Calendar,
  Activity,
  ArrowRight,
  Settings,
  TrendingUp,
  Clock,
  FileText,
} from "lucide-react";

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const { user, isLoading: userLoading } = useCurrentUser();

  const stats = useQuery(
    api.modules.telehealth.superAdmin.getPlatformStats,
    user?._id ? {} : "skip"
  );

  if (userLoading || stats === undefined) {
    return <FullPageSpinner />;
  }

  const quickActions = [
    {
      title: "Appointments",
      description: "Review and manage appointments",
      icon: Calendar,
      href: "/admin/appointments",
      color: "text-indigo-600",
    },
    {
      title: "Encounters",
      description: "View encounter documentation",
      icon: FileText,
      href: "/admin/encounters",
      color: "text-rose-600",
    },
    {
      title: "Manage Patients",
      description: "View and manage all patients",
      icon: Users,
      href: "/admin/patients",
      color: "text-blue-600",
    },
    {
      title: "Manage Providers",
      description: "View and manage providers",
      icon: UserCheck,
      href: "/admin/providers",
      color: "text-green-600",
    },
    {
      title: "Platform Settings",
      description: "Configure platform settings",
      icon: Settings,
      href: "/admin/settings",
      color: "text-purple-600",
    },
  ];

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Welcome Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Platform overview and management
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Patients</p>
                <p className="text-3xl font-bold mt-1">{stats?.totalPatients || 0}</p>
              </div>
              <div className="p-3 rounded-lg bg-blue-100 text-blue-600">
                <Users className="h-6 w-6" />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-2 text-sm text-green-600">
              <TrendingUp className="h-4 w-4" />
              <span>Active users</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Providers</p>
                <p className="text-3xl font-bold mt-1">{stats?.totalProviders || 0}</p>
              </div>
              <div className="p-3 rounded-lg bg-green-100 text-green-600">
                <UserCheck className="h-6 w-6" />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-2 text-sm text-muted-foreground">
              <Activity className="h-4 w-4" />
              <span>Verified providers</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Appointments Today</p>
                <p className="text-3xl font-bold mt-1">{stats?.appointmentsToday || 0}</p>
              </div>
              <div className="p-3 rounded-lg bg-purple-100 text-purple-600">
                <Calendar className="h-6 w-6" />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Scheduled today</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">New This Week</p>
                <p className="text-3xl font-bold mt-1">{stats?.newRegistrationsThisWeek || 0}</p>
              </div>
              <div className="p-3 rounded-lg bg-orange-100 text-orange-600">
                <Activity className="h-6 w-6" />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-2 text-sm text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              <span>New registrations</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {quickActions.map((action) => (
            <Card
              key={action.title}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate(action.href)}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-lg bg-muted ${action.color}`}>
                      <action.icon className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{action.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {action.description}
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest platform events</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Activity className="h-12 w-12 mx-auto mb-4" />
            <p>Activity log coming soon</p>
            <p className="text-sm">Platform events will appear here</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
