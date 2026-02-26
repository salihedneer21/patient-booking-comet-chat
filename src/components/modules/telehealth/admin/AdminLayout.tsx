import { NavLink, Outlet } from "react-router-dom";
import { LayoutDashboard, Users, UserCheck, Calendar, FileText, MessageSquare, Settings, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button-variants";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetClose, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

type NavItem = {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  end?: boolean;
};

const primaryNav: NavItem[] = [
  { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/appointments", label: "Appointments", icon: Calendar },
  { to: "/admin/encounters", label: "Encounters", icon: FileText },
];

const directoryNav: NavItem[] = [
  { to: "/admin/patients", label: "Patients", icon: Users },
  { to: "/admin/providers", label: "Providers", icon: UserCheck },
];

const systemNav: NavItem[] = [
  { to: "/admin/messages", label: "Messages", icon: MessageSquare },
  { to: "/admin/settings", label: "Settings", icon: Settings },
];

function SidebarNavLink({ item, closeOnNavigate }: { item: NavItem; closeOnNavigate?: boolean }) {
  const link = (
    <NavLink
      to={item.to}
      end={item.end}
      className={({ isActive }) =>
        cn(
          buttonVariants({ variant: isActive ? "secondary" : "ghost", size: "sm" }),
          "w-full justify-start gap-2",
        )
      }
    >
      <item.icon className="h-4 w-4" />
      <span className="truncate">{item.label}</span>
    </NavLink>
  );

  return closeOnNavigate ? <SheetClose asChild>{link}</SheetClose> : link;
}

function SidebarContent({ closeOnNavigate }: { closeOnNavigate?: boolean }) {
  return (
    <div className="flex h-full flex-col">
      <div className="px-6 py-5">
        <p className="text-xs font-medium text-muted-foreground">Administration</p>
        <p className="text-lg font-semibold leading-tight">Admin Portal</p>
      </div>
      <Separator />
      <ScrollArea className="flex-1 px-4 py-4">
        <nav className="space-y-6">
          <div className="space-y-1">
            <p className="px-2 text-xs font-medium text-muted-foreground">Overview</p>
            {primaryNav.map((item) => (
              <SidebarNavLink key={item.to} item={item} closeOnNavigate={closeOnNavigate} />
            ))}
          </div>

          <div className="space-y-1">
            <p className="px-2 text-xs font-medium text-muted-foreground">Directory</p>
            {directoryNav.map((item) => (
              <SidebarNavLink key={item.to} item={item} closeOnNavigate={closeOnNavigate} />
            ))}
          </div>

          <div className="space-y-1">
            <p className="px-2 text-xs font-medium text-muted-foreground">System</p>
            {systemNav.map((item) => (
              <SidebarNavLink key={item.to} item={item} closeOnNavigate={closeOnNavigate} />
            ))}
          </div>
        </nav>
      </ScrollArea>
    </div>
  );
}

export default function AdminLayout() {
  return (
    <div className="flex flex-1 min-h-0">
      {/* Desktop sidebar */}
      <aside className="hidden lg:block w-72 border-r bg-background">
        <div className="sticky top-16 h-[calc(100vh-4rem)]">
          <SidebarContent />
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile menu */}
        <div className="lg:hidden border-b bg-background px-4 py-3">
          <div className="flex items-center gap-3">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="shrink-0">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Open navigation</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0">
                <SidebarContent closeOnNavigate />
              </SheetContent>
            </Sheet>
            <div className="min-w-0">
              <p className="text-sm font-medium leading-none">Admin</p>
              <p className="text-xs text-muted-foreground truncate">
                Platform management
              </p>
            </div>
          </div>
        </div>

        <Outlet />
      </div>
    </div>
  );
}

