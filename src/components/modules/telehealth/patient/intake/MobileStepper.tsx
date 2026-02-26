import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Step {
  number: number;
  title: string;
}

interface MobileStepperProps {
  steps: Step[];
  currentStep: number;
  isCompleted?: boolean;
}

export function MobileStepper({
  steps,
  currentStep,
  isCompleted = false,
}: MobileStepperProps) {
  return (
    <div className="bg-card rounded-lg border p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold">
          {isCompleted ? "Edit Information" : "Patient Intake"}
        </h2>
        <span className="text-sm text-muted-foreground">
          Step {currentStep} of {steps.length}
        </span>
      </div>

      <div className="flex items-center gap-1">
        {steps.map((step, index) => {
          const isActive = step.number === currentStep;
          const isComplete = isCompleted || step.number < currentStep;

          return (
            <div key={step.number} className="flex items-center flex-1">
              <div
                className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : isComplete
                    ? "bg-green-500 text-white"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {isComplete && !isActive ? (
                  <Check className="w-3 h-3" />
                ) : (
                  step.number
                )}
              </div>
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "flex-1 h-0.5 mx-1",
                    step.number < currentStep ? "bg-green-500" : "bg-muted"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      <p className="mt-3 text-sm font-medium">
        {steps.find((s) => s.number === currentStep)?.title}
      </p>
    </div>
  );
}
