import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Doc } from "../../../../../convex/_generated/dataModel";
import { useCurrentUser } from "@/lib/useCurrentUser";
import FullPageSpinner from "@/components/ui/FullPageSpinner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Search,
  User,
  FileText,
  MessageSquare,
  ChevronRight,
} from "lucide-react";
import { format } from "date-fns";

export default function ProviderPatientsPage() {
  const navigate = useNavigate();
  const { user, isLoading: userLoading } = useCurrentUser();
  const [searchQuery, setSearchQuery] = useState("");

  // Get all appointments to extract unique patients
  const appointments = useQuery(
    api.modules.telehealth.appointments.getByProvider,
    user?._id ? { providerId: user._id } : "skip"
  ) as Doc<"appointments">[] | undefined;

  if (userLoading || appointments === undefined) {
    return <FullPageSpinner />;
  }

  // Extract unique patient IDs and their latest appointment
  const patientMap = new Map<string, {
    patientId: string;
    lastVisit: number;
    upcomingAppointments: number;
    totalVisits: number;
  }>();

  appointments?.forEach((apt) => {
    const existing = patientMap.get(apt.patientId);
    if (!existing) {
      patientMap.set(apt.patientId, {
        patientId: apt.patientId,
        lastVisit: apt.status === "completed" ? apt.scheduledAt : 0,
        upcomingAppointments: apt.status === "upcoming" ? 1 : 0,
        totalVisits: apt.status === "completed" ? 1 : 0,
      });
    } else {
      if (apt.status === "completed") {
        existing.lastVisit = Math.max(existing.lastVisit, apt.scheduledAt);
        existing.totalVisits += 1;
      }
      if (apt.status === "upcoming") {
        existing.upcomingAppointments += 1;
      }
    }
  });

  const patients = Array.from(patientMap.values());

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">My Patients</h1>
          <p className="text-muted-foreground">
            {patients.length} patient{patients.length !== 1 ? "s" : ""} in your care
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle>Patient List</CardTitle>
              <CardDescription>
                View and manage your patients
              </CardDescription>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search patients..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {patients.length === 0 ? (
            <div className="text-center py-12">
              <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No patients yet</p>
              <p className="text-sm text-muted-foreground">
                Patients will appear here after their first appointment
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {patients.map((patient) => (
                <div
                  key={patient.patientId}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => navigate(`/provider/patients/${patient.patientId}/chart`)}
                >
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback>
                        <User className="h-6 w-6" />
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">Patient</p>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{patient.totalVisits} visit{patient.totalVisits !== 1 ? "s" : ""}</span>
                        {patient.lastVisit > 0 && (
                          <>
                            <span>•</span>
                            <span>
                              Last visit: {format(new Date(patient.lastVisit), "MMM d, yyyy")}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {patient.upcomingAppointments > 0 && (
                      <Badge variant="secondary">
                        {patient.upcomingAppointments} upcoming
                      </Badge>
                    )}
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/provider/patients/${patient.patientId}/chart`);
                        }}
                      >
                        <FileText className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate("/provider/messages");
                        }}
                      >
                        <MessageSquare className="h-4 w-4" />
                      </Button>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
