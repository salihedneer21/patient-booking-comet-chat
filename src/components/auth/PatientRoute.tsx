import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useConvexAuth } from "convex/react";
import { useQuery } from "convex/react";
import FullPageSpinner from "@/components/ui/FullPageSpinner";
import { useAuthHydration } from "@/lib/auth-hydration";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { api } from "../../../convex/_generated/api";

export default function PatientRoute() {
  const location = useLocation();
  const { isLoading: isAuthLoading, isAuthenticated } = useConvexAuth();
  const { user, isLoading: isUserLoading } = useCurrentUser();
  const showLoader = useAuthHydration(isAuthLoading || isUserLoading);

  const intake = useQuery(
    api.modules.telehealth.patientIntake.getMyIntake,
    user?._id && user.role === "patient" ? { userId: user._id } : "skip",
  );

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

  // Not a patient - redirect based on role
  if (user.role !== "patient") {
    if (user.role === "provider") {
      return <Navigate to="/provider/dashboard" replace />;
    }
    return <Navigate to="/admin/dashboard" replace />;
  }

  const isIntakeRoute = location.pathname === "/intake";

  // Force incomplete patients through intake funnel.
  if (!isIntakeRoute) {
    if (intake === undefined) {
      return <FullPageSpinner />;
    }

    if (!intake || !intake.intakeCompleted) {
      return <Navigate to="/intake" replace />;
    }
  }

  return <Outlet />;
}
