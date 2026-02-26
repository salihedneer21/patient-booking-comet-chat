import type { ReactNode } from "react";
import { IntakeSidebar } from "./IntakeSidebar";
import { MobileStepper } from "./MobileStepper";

interface IntakeLayoutProps {
  children: ReactNode;
  currentStep: number;
  totalSteps?: number;
  isCompleted?: boolean;
  onStepClick?: (step: number) => void;
}

export function IntakeLayout({
  children,
  currentStep,
  isCompleted = false,
  onStepClick,
}: IntakeLayoutProps) {
  const steps = [
    { number: 1, title: "Personal Info" },
    { number: 2, title: "Address" },
    { number: 3, title: "Insurance" },
    { number: 4, title: "Medical History" },
    { number: 5, title: "Consent" },
    { number: 6, title: "Review" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6">
        {/* Mobile Stepper */}
        <div className="block md:hidden mb-6">
          <MobileStepper
            steps={steps}
            currentStep={currentStep}
            isCompleted={isCompleted}
          />
        </div>

        <div className="flex gap-8">
          {/* Desktop Sidebar */}
          <div className="hidden md:block w-64 flex-shrink-0">
            <IntakeSidebar
              steps={steps}
              currentStep={currentStep}
              isCompleted={isCompleted}
              onStepClick={onStepClick}
            />
          </div>

          {/* Main Content */}
          <div className="flex-1 max-w-3xl">{children}</div>
        </div>
      </div>
    </div>
  );
}
