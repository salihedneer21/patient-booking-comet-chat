import { Navigate, Outlet } from "react-router-dom";
import { useConvexAuth } from "convex/react";
import FullPageSpinner from "@/components/ui/FullPageSpinner";
import { useAuthHydration } from "@/lib/auth-hydration";
import { useCurrentUser } from "@/lib/useCurrentUser";

export default function AdminRoute() {
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

  // Not an admin - redirect based on role
  if (user.role !== "admin") {
    if (user.role === "provider") {
      return <Navigate to="/provider/dashboard" replace />;
    }
    return <Navigate to="/patient/dashboard" replace />;
  }

  return <Outlet />;
}
