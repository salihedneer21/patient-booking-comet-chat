import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";

interface StepNavigationProps {
  currentStep: number;
  totalSteps: number;
  onBack: () => void;
  onNext: () => void;
  onSubmit?: () => void;
  isLoading?: boolean;
  nextDisabled?: boolean;
  nextLabel?: string;
}

export function StepNavigation({
  currentStep,
  totalSteps,
  onBack,
  onNext,
  onSubmit,
  isLoading = false,
  nextDisabled = false,
  nextLabel,
}: StepNavigationProps) {
  const isFirstStep = currentStep === 1;
  const isLastStep = currentStep === totalSteps;

  return (
    <div className="flex items-center justify-between pt-6 mt-6 border-t">
      <Button
        type="button"
        variant="outline"
        onClick={onBack}
        disabled={isFirstStep || isLoading}
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back
      </Button>

      {isLastStep && onSubmit ? (
        <Button
          type="button"
          onClick={onSubmit}
          disabled={isLoading || nextDisabled}
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Check className="w-4 h-4 mr-2" />
          )}
          Complete Registration
        </Button>
      ) : (
        <Button
          type="button"
          onClick={onNext}
          disabled={isLoading || nextDisabled}
        >
          {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {nextLabel || "Continue"}
          {!isLoading && <ArrowRight className="w-4 h-4 ml-2" />}
        </Button>
      )}
    </div>
  );
}
