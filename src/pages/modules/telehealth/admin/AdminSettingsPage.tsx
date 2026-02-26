import { useNavigate } from "react-router-dom";
import { useCurrentUser } from "@/lib/useCurrentUser";
import FullPageSpinner from "@/components/ui/FullPageSpinner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Settings,
  Video,
  Bell,
  Mail,
  Shield,
  Database,
} from "lucide-react";

export default function AdminSettingsPage() {
  const navigate = useNavigate();
  const { isLoading: userLoading } = useCurrentUser();

  if (userLoading) {
    return <FullPageSpinner />;
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Platform Settings</h1>
          <p className="text-muted-foreground">Configure your telehealth platform</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Video Calling Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Video className="h-5 w-5" />
              Video Calling (CometChat)
            </CardTitle>
            <CardDescription>
              Configure video calling settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Enable Video Calls</p>
                <p className="text-sm text-muted-foreground">
                  Allow patients and providers to make video calls
                </p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Enable Screen Sharing</p>
                <p className="text-sm text-muted-foreground">
                  Allow screen sharing during video calls
                </p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Recording</p>
                <p className="text-sm text-muted-foreground">
                  Allow call recording (with consent)
                </p>
              </div>
              <Switch />
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>Note:</strong> CometChat credentials must be configured via environment
                variables (VITE_COMETCHAT_APP_ID, VITE_COMETCHAT_REGION) and Convex env
                (COMETCHAT_APP_ID, COMETCHAT_API_KEY, COMETCHAT_REGION).
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
            </CardTitle>
            <CardDescription>
              Configure notification preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Email Notifications</p>
                <p className="text-sm text-muted-foreground">
                  Send email notifications for appointments
                </p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">In-App Notifications</p>
                <p className="text-sm text-muted-foreground">
                  Show in-app notification alerts
                </p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Appointment Reminders</p>
                <p className="text-sm text-muted-foreground">
                  Send reminders before appointments
                </p>
              </div>
              <Switch defaultChecked />
            </div>
          </CardContent>
        </Card>

        {/* Email Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Email Configuration
            </CardTitle>
            <CardDescription>
              Configure email delivery settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>From Email Address</Label>
              <Input
                defaultValue="noreply@telehealth.com"
                className="mt-1"
                disabled
              />
              <p className="text-xs text-muted-foreground mt-1">
                Configure via RESEND_API_KEY and AUTH_EMAIL environment variables
              </p>
            </div>
            <div>
              <Label>Support Email</Label>
              <Input
                defaultValue="support@telehealth.com"
                className="mt-1"
              />
            </div>
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Security & Compliance
            </CardTitle>
            <CardDescription>
              HIPAA compliance and security settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Require Email Verification</p>
                <p className="text-sm text-muted-foreground">
                  Users must verify email before accessing platform
                </p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Require Intake Completion</p>
                <p className="text-sm text-muted-foreground">
                  Patients must complete intake before booking
                </p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">HIPAA Consent Required</p>
                <p className="text-sm text-muted-foreground">
                  Patients must accept HIPAA consent during intake
                </p>
              </div>
              <Switch defaultChecked disabled />
            </div>
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800">
                <strong>HIPAA Compliance:</strong> This platform is designed with HIPAA compliance
                in mind. All data is encrypted in transit and at rest. Ensure you have a signed
                BAA with Convex and any third-party services.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Data Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Data Management
            </CardTitle>
            <CardDescription>
              Manage platform data and backups
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="font-medium">Export All Data</p>
                <p className="text-sm text-muted-foreground">
                  Download all platform data in JSON format
                </p>
              </div>
              <Button variant="outline">Export</Button>
            </div>
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="font-medium">Clear Test Data</p>
                <p className="text-sm text-muted-foreground">
                  Remove all test/demo data from the platform
                </p>
              </div>
              <Button variant="outline" className="text-destructive">
                Clear Data
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Environment Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Environment
            </CardTitle>
            <CardDescription>
              Current environment configuration
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground">Environment</p>
                <p className="font-medium">Development</p>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground">Convex Deployment</p>
                <p className="font-medium truncate">
                  {import.meta.env.VITE_CONVEX_URL || "Not configured"}
                </p>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground">CometChat Region</p>
                <p className="font-medium">
                  {import.meta.env.VITE_COMETCHAT_REGION || "Not configured"}
                </p>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground">CometChat App ID</p>
                <p className="font-medium">
                  {import.meta.env.VITE_COMETCHAT_APP_ID ? "Configured" : "Not configured"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
