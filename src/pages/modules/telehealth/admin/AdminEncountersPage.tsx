import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Doc, Id } from "../../../../../convex/_generated/dataModel";
import { useCurrentUser } from "@/lib/useCurrentUser";
import FullPageSpinner from "@/components/ui/FullPageSpinner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, FileText, Search, UserCheck } from "lucide-react";
import { format } from "date-fns";

type ProviderListItem = {
  user: Doc<"users">;
  profile: {
    _id: Id<"providerProfiles">;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
};

type EncounterStatus = "draft" | "finalized";

export default function AdminEncountersPage() {
  const navigate = useNavigate();
  const { user, isLoading: userLoading } = useCurrentUser();

  const [searchQuery, setSearchQuery] = useState("");

  const encounters = useQuery(
    api.modules.telehealth.encounters.listAllForAdmin,
    user?._id ? {} : "skip",
  ) as Doc<"encounters">[] | undefined;

  const intakes = useQuery(
    api.modules.telehealth.patientIntake.listAll,
    user?._id ? {} : "skip",
  ) as Doc<"patientIntake">[] | undefined;

  const providersData = useQuery(
    api.modules.telehealth.superAdmin.listAllProviders,
    user?._id ? { includeInactive: true } : "skip",
  ) as ProviderListItem[] | undefined;

  const patientByIntakeId = useMemo(() => {
    const map = new Map<string, { userId: Id<"users">; name: string }>();
    for (const intake of intakes ?? []) {
      const name = `${intake.firstName} ${intake.lastName}`.trim() || intake.email;
      map.set(intake._id, { userId: intake.userId, name });
    }
    return map;
  }, [intakes]);

  const providerNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of providersData ?? []) {
      const fromProfile = item.profile
        ? `${item.profile.firstName} ${item.profile.lastName}`.trim()
        : "";
      const name = fromProfile
        ? `Dr. ${fromProfile}`
        : item.user.name || item.user.email || "Provider";
      map.set(item.user._id, name);
    }
    return map;
  }, [providersData]);

  const filterEncounters = (status: EncounterStatus | "all") => {
    const list = encounters ?? [];
    const byStatus = status === "all" ? list : list.filter((e) => e.status === status);

    const query = searchQuery.trim().toLowerCase();
    if (!query) return byStatus;

    return byStatus.filter((e) => {
      const patient = patientByIntakeId.get(e.patientId);
      const providerName = providerNameById.get(e.providerId) ?? "";
      return (
        (patient?.name ?? "").toLowerCase().includes(query) ||
        providerName.toLowerCase().includes(query) ||
        (e.chiefComplaint ?? "").toLowerCase().includes(query) ||
        e.encounterDate.toLowerCase().includes(query)
      );
    });
  };

  if (userLoading || encounters === undefined || intakes === undefined || providersData === undefined) {
    return <FullPageSpinner />;
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Encounters</h1>
          <p className="text-muted-foreground">
            Clinical encounter notes and documentation
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

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="draft">Draft</TabsTrigger>
          <TabsTrigger value="finalized">Finalized</TabsTrigger>
        </TabsList>

        {(["all", "draft", "finalized"] as const).map((tab) => {
          const list = filterEncounters(tab);
          const sorted = list
            .slice()
            .sort((a, b) => b.startedAt - a.startedAt)
            .slice(0, 100);

          return (
            <TabsContent key={tab} value={tab} className="space-y-4">
              {sorted.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center text-muted-foreground">
                    No encounters found
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {sorted.map((encounter) => {
                    const patient = patientByIntakeId.get(encounter.patientId);
                    const providerName =
                      providerNameById.get(encounter.providerId) ?? "Provider";
                    const statusLabel = encounter.status as EncounterStatus;

                    return (
                      <Card key={encounter._id}>
                        <CardContent className="p-4">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="min-w-0 space-y-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge
                                  variant={statusLabel === "finalized" ? "secondary" : "default"}
                                >
                                  {statusLabel}
                                </Badge>
                                <span className="text-sm text-muted-foreground">
                                  {encounter.encounterDate} •{" "}
                                  {format(new Date(encounter.startedAt), "h:mm a")}
                                </span>
                              </div>

                              <div className="flex flex-wrap items-center gap-3 text-sm">
                                <div className="flex items-center gap-2 min-w-0">
                                  <UserCheck className="h-4 w-4 text-muted-foreground" />
                                  <span className="truncate">{providerName}</span>
                                </div>
                                {patient ? (
                                  <button
                                    className="truncate underline-offset-2 hover:underline"
                                    onClick={() =>
                                      navigate(`/admin/patients/${patient.userId}`)
                                    }
                                  >
                                    {patient.name}
                                  </button>
                                ) : (
                                  <span className="text-muted-foreground">Unknown patient</span>
                                )}
                              </div>

                              <p className="font-medium truncate">
                                {encounter.chiefComplaint || "No chief complaint"}
                              </p>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => navigate(`/provider/encounter/${encounter._id}`)}
                              >
                                <FileText className="h-4 w-4 mr-2" />
                                View
                              </Button>
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
    </div>
  );
}

