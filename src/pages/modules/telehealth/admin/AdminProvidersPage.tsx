import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Doc, Id } from "../../../../../convex/_generated/dataModel";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { provisioningAuthClient } from "@/lib/provisioning-auth-client";
import { generateStrongPassword } from "@/lib/password";
import FullPageSpinner from "@/components/ui/FullPageSpinner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowLeft,
  Search,
  User,
  UserPlus,
  MoreVertical,
  Mail,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Stethoscope,
} from "lucide-react";
import toast from "react-hot-toast";

type ProviderListItem = {
  user: Doc<"users">;
  profile: {
    _id: Id<"providerProfiles">;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
};

export default function AdminProvidersPage() {
  const navigate = useNavigate();
  const { user, isLoading: userLoading } = useCurrentUser();
  const [searchQuery, setSearchQuery] = useState("");
  const [addProviderDialog, setAddProviderDialog] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<{
    email: string;
    tempPassword: string;
  } | null>(null);
  const [newEmail, setNewEmail] = useState("");
  const [newFirstName, setNewFirstName] = useState("");
  const [newLastName, setNewLastName] = useState("");
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    userId: Id<"users"> | null;
    userName: string;
  }>({ open: false, userId: null, userName: "" });
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const providersData = useQuery(
    api.modules.telehealth.superAdmin.listAllProviders,
    user?._id ? { includeInactive: true } : "skip"
  ) as ProviderListItem[] | undefined;
  const createProvider = useMutation(api.modules.telehealth.superAdmin.createProvider);
  const toggleProviderStatus = useMutation(api.modules.telehealth.superAdmin.toggleProviderStatus);
  const deleteUser = useMutation(api.modules.telehealth.superAdmin.deleteUser);
  const updateUserRole = useMutation(api.modules.telehealth.superAdmin.updateUserRole);

  if (userLoading || providersData === undefined) {
    return <FullPageSpinner />;
  }

  const filteredProviders = (providersData || []).filter((item) => {
    const searchLower = searchQuery.toLowerCase();
    const fullName = item.profile
      ? `${item.profile.firstName} ${item.profile.lastName}`
      : item.user.name || "";
    return (
      fullName.toLowerCase().includes(searchLower) ||
      item.user.email?.toLowerCase().includes(searchLower)
    );
  });

  const handleDeleteUser = async () => {
    if (!deleteDialog.userId) return;
    setIsDeleting(true);
    try {
      await deleteUser({ userId: deleteDialog.userId });
      toast.success("Provider deleted successfully");
      setDeleteDialog({ open: false, userId: null, userName: "" });
    } catch {
      toast.error("Failed to delete provider");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCreateProvider = async () => {
    const email = newEmail.trim().toLowerCase();
    if (!email) return;
    setIsCreating(true);
    try {
      const firstName = newFirstName.trim();
      const lastName = newLastName.trim();
      const name =
        `${firstName} ${lastName}`.trim() || email.split("@")[0] || email;

      const tempPassword = generateStrongPassword();

      const { error: signUpError } = await provisioningAuthClient.signUp.email({
        email,
        password: tempPassword,
        name,
      });
      if (signUpError) {
        throw new Error(signUpError.message || "Failed to create auth user");
      }

      const { data: sessionData, error: sessionError } =
        await provisioningAuthClient.getSession();
      if (sessionError) {
        throw new Error(sessionError.message || "Failed to read new user session");
      }

      const betterAuthUserId = sessionData?.user?.id;
      if (!betterAuthUserId) {
        throw new Error("Failed to read new user's id");
      }

      await provisioningAuthClient.signOut();

      await createProvider({
        betterAuthUserId,
        email,
        name,
        firstName: firstName || undefined,
        lastName: lastName || undefined,
      });

      setCreatedCredentials({ email, tempPassword });
      toast.success("Provider created");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create provider");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Providers</h1>
          <p className="text-muted-foreground">
            {providersData?.length || 0} provider{(providersData?.length || 0) !== 1 ? "s" : ""} registered
          </p>
        </div>
        <Button
          onClick={() => {
            setAddProviderDialog(true);
            setCreatedCredentials(null);
            setNewEmail("");
            setNewFirstName("");
            setNewLastName("");
          }}
        >
          <UserPlus className="h-4 w-4 mr-2" />
          Add Provider
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle>All Providers</CardTitle>
              <CardDescription>
                Manage provider accounts
              </CardDescription>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search providers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredProviders.length === 0 ? (
            <div className="text-center py-12">
              <Stethoscope className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">
                {searchQuery ? "No providers match your search" : "No providers registered yet"}
              </p>
              <Button onClick={() => setAddProviderDialog(true)}>
                <UserPlus className="h-4 w-4 mr-2" />
                Add Provider
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredProviders.map((item) => {
                const displayName = item.profile
                  ? `${item.profile.firstName} ${item.profile.lastName}`.trim()
                  : item.user.name || "Unknown";
                return (
                  <div
                    key={item.user._id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/admin/providers/${item.user._id}`)}
                  >
                    <div className="flex items-center gap-4">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback>
                          <User className="h-6 w-6" />
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{displayName}</p>
                          <Badge variant={item.user.isActive ? "secondary" : "outline"}>
                            {item.user.isActive ? (
                              <>
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Active
                              </>
                            ) : (
                              <>
                                <XCircle className="h-3 w-3 mr-1" />
                                Inactive
                              </>
                            )}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                          <div className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            <span>{item.user.email}</span>
                          </div>
                        </div>
                        {!item.profile && (
                          <p className="text-sm text-yellow-600 mt-1">
                            Profile not completed
                          </p>
                        )}
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          navigate(`/admin/providers/${item.user._id}`);
                        }}
                      >
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={async (e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          try {
                            await toggleProviderStatus({ userId: item.user._id });
                            toast.success(
                              item.user.isActive ? "Provider deactivated" : "Provider activated",
                            );
                          } catch {
                            toast.error("Failed to update provider status");
                          }
                        }}
                      >
                        {item.user.isActive ? "Deactivate" : "Activate"}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={async (e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          await updateUserRole({
                            userId: item.user._id,
                            role: "patient",
                          });
                          toast.success("Provider demoted to patient");
                        }}
                      >
                        Demote to Patient
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setDeleteDialog({
                            open: true,
                            userId: item.user._id,
                            userName: displayName || item.user.email,
                          });
                        }}
                      >
                        Delete Provider
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Provider Dialog */}
      <Dialog open={addProviderDialog} onOpenChange={setAddProviderDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Provider</DialogTitle>
            <DialogDescription>
              Creates a new provider account and generates a temporary password.
            </DialogDescription>
          </DialogHeader>
          {createdCredentials ? (
            <div className="space-y-4">
              <div className="rounded-lg border p-4 space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{createdCredentials.email}</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tempPassword">Temporary Password</Label>
                  <div className="flex gap-2">
                    <Input
                      id="tempPassword"
                      value={createdCredentials.tempPassword}
                      readOnly
                      className="font-mono"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(
                            createdCredentials.tempPassword,
                          );
                          toast.success("Password copied");
                        } catch {
                          toast.error("Failed to copy");
                        }
                      }}
                    >
                      Copy
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Copy this now — it won't be shown again.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="provider@example.com"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First name</Label>
                  <Input
                    id="firstName"
                    value={newFirstName}
                    onChange={(e) => setNewFirstName(e.target.value)}
                    placeholder="Alex"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last name</Label>
                  <Input
                    id="lastName"
                    value={newLastName}
                    onChange={(e) => setNewLastName(e.target.value)}
                    placeholder="Smith"
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAddProviderDialog(false)}
              disabled={isCreating}
            >
              {createdCredentials ? "Close" : "Cancel"}
            </Button>
            {!createdCredentials && (
              <Button
                onClick={handleCreateProvider}
                disabled={isCreating || !newEmail.trim()}
              >
                {isCreating ? "Creating..." : "Create Provider"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog
        open={deleteDialog.open}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteDialog({ open: false, userId: null, userName: "" });
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete Provider
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {deleteDialog.userName}? This action
              cannot be undone and will remove all associated data including
              provider profile and availability.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialog({ open: false, userId: null, userName: "" })}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteUser}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete Provider"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
