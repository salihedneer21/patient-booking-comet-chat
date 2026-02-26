import { Navigate, Outlet } from "react-router-dom";
import { useConvexAuth } from "convex/react";
import FullPageSpinner from "@/components/ui/FullPageSpinner";
import { useAuthHydration } from "@/lib/auth-hydration";
import { useCurrentUser } from "@/lib/useCurrentUser";

/**
 * ProviderRoute - Allows both providers and admins
 * Admins have all provider capabilities plus admin features
 */
export default function ProviderRoute() {
  const { isLoading: isAuthLoading, isAuthenticated } = useConvexAuth();
  const { user, isLoading: isUserLoading } = useCurrentUser();
  const showLoader = useAuthHydration(isAuthLoading || isUserLoading);

  if (showLoader) {
    return <FullPageSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Still loading user data (user being auto-created)
  if (user === undefined || user === null) {
    return <FullPageSpinner />;
  }

  // Check if user is active
  if (!user.isActive) {
    return <Navigate to="/account-inactive" replace />;
  }

  // Allow providers and admins
  if (user.role !== "provider" && user.role !== "admin") {
    // Patients go to patient dashboard
    return <Navigate to="/patient/dashboard" replace />;
  }

  return <Outlet />;
}
