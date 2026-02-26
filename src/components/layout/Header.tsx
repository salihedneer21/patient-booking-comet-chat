import { useState } from "react";
import { Link } from "react-router-dom";
import { useConvexAuth } from "convex/react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { useCurrentUser } from "@/lib/useCurrentUser";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Settings, Shield, Stethoscope, User, LogOut } from "lucide-react";

export default function Header() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { user } = useCurrentUser();
  const { data: session } = authClient.useSession();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const userEmail = session?.user?.email ?? "";
  const initials = userEmail ? userEmail[0]?.toUpperCase() : "U";

  const handleSignOut = async () => {
    setIsSigningOut(true);
    await authClient.signOut();
    toast.success("You've been signed out");
    setIsSigningOut(false);
  };

  const dashboardPath =
    user?.role === "admin"
      ? "/admin/dashboard"
      : user?.role === "provider"
        ? "/provider/dashboard"
        : "/patient/dashboard";
  const dashboardLabel =
    user?.role === "admin"
      ? "Admin Dashboard"
      : user?.role === "provider"
        ? "Provider Dashboard"
        : "Dashboard";

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-card shadow-sm">
      <div className="container mx-auto flex h-16 max-w-5xl items-center justify-between px-4 md:px-4">
        <Link to="/" className="flex items-center gap-2">
          <img src="/logo.svg" alt="Specode" className="h-7 w-auto" />
        </Link>

        <nav className="flex items-center gap-2">
          <ThemeToggle />

          {isLoading ? (
            <div className="flex items-center gap-2">
              <div className="h-9 w-24 animate-pulse rounded-full bg-muted" />
              <div className="h-9 w-9 animate-pulse rounded-full bg-muted" />
            </div>
          ) : isAuthenticated ? (
            <>
              {user && (
                <Button variant="outline" size="sm" className="rounded-full" asChild>
                  <Link to={dashboardPath} className="gap-2">
                    {user.role === "admin" ? (
                      <Shield className="w-4 h-4" />
                    ) : user.role === "provider" ? (
                      <Stethoscope className="w-4 h-4" />
                    ) : (
                      <User className="w-4 h-4" />
                    )}
                    {dashboardLabel}
                  </Link>
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 rounded-full border border-border"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold leading-none text-primary">
                      {initials}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="text-xs text-muted-foreground">
                    {userEmail || "Signed in"}
                  </DropdownMenuLabel>
                  {user && (
                    <DropdownMenuLabel className="text-xs font-normal">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${
                          user.role === "admin"
                            ? "bg-primary/10 text-primary"
                            : user.role === "provider"
                              ? "bg-blue-500/10 text-blue-700 dark:text-blue-400"
                              : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {user.role === "admin" ? (
                          <Shield className="w-3 h-3" />
                        ) : user.role === "provider" ? (
                          <Stethoscope className="w-3 h-3" />
                        ) : (
                          <User className="w-3 h-3" />
                        )}
                        {user.role === "admin"
                          ? "Admin"
                          : user.role === "provider"
                            ? "Provider"
                            : "Patient"}
                      </span>
                    </DropdownMenuLabel>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link
                      to="/profile"
                      className="flex cursor-pointer items-center gap-2"
                    >
                      <Settings className="h-4 w-4" />
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onSelect={handleSignOut}
                    disabled={isSigningOut}
                    className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    {isSigningOut ? "Signing out..." : "Sign out"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" className="rounded-full" asChild>
                <Link to="/login">Sign In</Link>
              </Button>
              <Button size="sm" className="rounded-full" asChild>
                <Link to="/register">Sign up</Link>
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
