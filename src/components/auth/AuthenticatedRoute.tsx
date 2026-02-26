import { Navigate, Outlet } from "react-router-dom";
import FullPageSpinner from "@/components/ui/FullPageSpinner";
import { useConvexAuth } from "convex/react";
import { useAuthHydration } from "@/lib/auth-hydration";

// Simple auth check - only requires authentication, doesn't check active status
// Used for pages like /account-inactive that inactive users need to access
export default function AuthenticatedRoute() {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const showLoader = useAuthHydration(isLoading);

  if (showLoader) {
    return <FullPageSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
