import { useQuery, useMutation } from "convex/react";
import { useEffect, useRef } from "react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { authClient } from "./auth-client";

export type UserRole = "admin" | "provider" | "patient";

export interface CurrentUser {
  _id: Id<"users">;
  betterAuthUserId: string;
  email: string;
  name?: string;
  role: UserRole;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}

export function useCurrentUser() {
  const { data: session, isPending: isSessionLoading } = authClient.useSession();
  const betterAuthUserId = session?.user?.id;
  const email = session?.user?.email;
  const name = session?.user?.name;

  const user = useQuery(
    api.users.getCurrentUser,
    betterAuthUserId ? { betterAuthUserId } : "skip"
  );

  const getOrCreateUser = useMutation(api.users.getOrCreateUser);
  const hasCreatedRef = useRef(false);

  // Auto-create user as patient if they don't exist yet
  useEffect(() => {
    if (
      betterAuthUserId &&
      email &&
      user === null &&
      !hasCreatedRef.current
    ) {
      hasCreatedRef.current = true;
      getOrCreateUser({
        betterAuthUserId,
        email,
        name: name || undefined,
      }).catch((err) => {
        console.error("Failed to create user:", err);
        hasCreatedRef.current = false;
      });
    }
  }, [betterAuthUserId, email, name, user, getOrCreateUser]);

  // Reset ref when user logs out
  useEffect(() => {
    if (!betterAuthUserId) {
      hasCreatedRef.current = false;
    }
  }, [betterAuthUserId]);

  const isLoading = isSessionLoading || (betterAuthUserId !== undefined && user === undefined);

  return {
    user: user as CurrentUser | null | undefined,
    isLoading,
    isAuthenticated: !!session?.user,
    session,
  };
}

export function useIsAdmin() {
  const { user, isLoading } = useCurrentUser();
  return {
    isAdmin: user?.role === "admin",
    isLoading,
  };
}

export function useIsProvider() {
  const { user, isLoading } = useCurrentUser();
  return {
    isProvider: user?.role === "provider" || user?.role === "admin",
    isLoading,
  };
}

export function useIsPatient() {
  const { user, isLoading } = useCurrentUser();
  return {
    isPatient: user?.role === "patient",
    isLoading,
  };
}
