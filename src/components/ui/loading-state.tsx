import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface LoadingStateProps {
  className?: string;
  text?: string;
}

export function LoadingState({ className, text }: LoadingStateProps) {
  return (
    <div className={cn("space-y-4", className)}>
      {text && <p className="text-sm text-muted-foreground">{text}</p>}
      <Skeleton className="h-8 w-1/3" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  );
}
