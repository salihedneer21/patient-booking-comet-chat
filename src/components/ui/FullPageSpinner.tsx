import { Skeleton } from "@/components/ui/skeleton";

export default function FullPageSpinner() {
  return (
    <div className="fixed inset-0 z-50 bg-background">
      <div className="flex h-full flex-col">
        {/* Header skeleton */}
        <div className="border-b border-border bg-card px-4 py-4">
          <div className="mx-auto flex max-w-5xl items-center justify-between">
            <Skeleton className="h-7 w-24" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-9 w-9 rounded-full" />
              <Skeleton className="h-9 w-24 rounded-full" />
            </div>
          </div>
        </div>

        {/* Content skeleton */}
        <div className="flex-1 px-4 py-8">
          <div className="mx-auto max-w-5xl space-y-6">
            <div className="space-y-2">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-64" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Skeleton className="h-28 rounded-lg" />
              <Skeleton className="h-28 rounded-lg" />
              <Skeleton className="h-28 rounded-lg" />
              <Skeleton className="h-28 rounded-lg" />
            </div>
            <Skeleton className="h-64 rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}
