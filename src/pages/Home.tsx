import { Navigate } from "react-router-dom";
import { useConvexAuth } from "convex/react";
import { useCurrentUser } from "@/lib/useCurrentUser";
import FullPageSpinner from "@/components/ui/FullPageSpinner";

export default function Home() {
  const { isAuthenticated, isLoading: isAuthLoading } = useConvexAuth();
  const { user, isLoading: isUserLoading } = useCurrentUser();

  if (isAuthLoading) {
    return <FullPageSpinner />;
  }

  if (isAuthenticated) {
    if (isUserLoading || !user) {
      return <FullPageSpinner />;
    }
    if (!user.isActive) {
      return <Navigate to="/account-inactive" replace />;
    }
    return <Navigate to={user.role === "admin" ? "/admin" : "/patient"} replace />;
  }

  return (
    <div className="flex flex-1 items-center justify-center">
      {/* Empty landing page */}
    </div>
  );
}
