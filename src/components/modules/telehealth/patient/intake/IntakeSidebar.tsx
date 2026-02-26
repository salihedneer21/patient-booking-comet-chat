import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

interface Step {
  number: number;
  title: string;
}

interface IntakeSidebarProps {
  steps: Step[];
  currentStep: number;
  isCompleted?: boolean;
  onStepClick?: (step: number) => void;
}

export function IntakeSidebar({
  steps,
  currentStep,
  isCompleted = false,
  onStepClick,
}: IntakeSidebarProps) {
  return (
    <div className="bg-card rounded-lg border p-6 sticky top-6">
      <h2 className="text-lg font-semibold mb-1">
        {isCompleted ? "Edit Information" : "Patient Intake"}
      </h2>
      <p className="text-sm text-muted-foreground mb-6">
        {isCompleted
          ? "Update your information"
          : "Complete your registration"}
      </p>

      {isCompleted && (
        <Link
          to="/patient/dashboard"
          className="text-sm text-primary hover:underline block mb-6"
        >
          ← Back to Dashboard
        </Link>
      )}

      <nav className="space-y-1">
        {steps.map((step) => {
          const isActive = step.number === currentStep;
          const isComplete = isCompleted || step.number < currentStep;
          const canClick = isCompleted || step.number <= currentStep;

          return (
            <button
              key={step.number}
              onClick={() => canClick && onStepClick?.(step.number)}
              disabled={!canClick}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : isComplete
                  ? "text-foreground hover:bg-muted"
                  : "text-muted-foreground cursor-not-allowed"
              )}
            >
              <div
                className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium border",
                  isActive
                    ? "border-primary bg-primary text-primary-foreground"
                    : isComplete
                    ? "border-green-500 bg-green-500 text-white"
                    : "border-muted-foreground"
                )}
              >
                {isComplete && !isActive ? (
                  <Check className="w-3 h-3" />
                ) : (
                  step.number
                )}
              </div>
              <span className="text-sm">{step.title}</span>
            </button>
          );
        })}
      </nav>

      {!isCompleted && (
        <div className="mt-6 pt-6 border-t">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">
              {Math.round(((currentStep - 1) / (steps.length - 1)) * 100)}%
            </span>
          </div>
          <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{
                width: `${((currentStep - 1) / (steps.length - 1)) * 100}%`,
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
