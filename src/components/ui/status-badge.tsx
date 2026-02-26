import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { cva, type VariantProps } from "class-variance-authority";

const statusBadgeVariants = cva("", {
  variants: {
    status: {
      active: "bg-success/10 text-success hover:bg-success/20 border-success/20",
      inactive: "bg-muted text-muted-foreground hover:bg-muted/80",
      pending: "bg-warning/10 text-warning hover:bg-warning/20 border-warning/20",
      error: "bg-destructive/10 text-destructive hover:bg-destructive/20 border-destructive/20",
      info: "bg-info/10 text-info hover:bg-info/20 border-info/20",
      admin: "bg-primary/10 text-primary hover:bg-primary/20 border-primary/20",
      patient: "bg-muted text-muted-foreground hover:bg-muted/80",
    },
  },
  defaultVariants: {
    status: "active",
  },
});

interface StatusBadgeProps extends VariantProps<typeof statusBadgeVariants> {
  children: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
}

export function StatusBadge({
  status,
  children,
  className,
  icon,
}: StatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(statusBadgeVariants({ status }), className)}
    >
      {icon && <span className="mr-1">{icon}</span>}
      {children}
    </Badge>
  );
}
