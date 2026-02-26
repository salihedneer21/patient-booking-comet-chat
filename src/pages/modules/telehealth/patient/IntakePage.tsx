import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { useCurrentUser } from "@/lib/useCurrentUser";
import FullPageSpinner from "@/components/ui/FullPageSpinner";
import {
  IntakeLayout,
  PersonalInfoStep,
  AddressStep,
  InsuranceStep,
  MedicalHistoryStep,
  ConsentStep,
  ReviewStep,
} from "@/components/modules/telehealth/patient/intake";

export default function IntakePage() {
  const navigate = useNavigate();
  const { user, isLoading: userLoading } = useCurrentUser();
  const initializeIntake = useMutation(api.modules.telehealth.patientIntake.initializeIntake);
  const goToStep = useMutation(api.modules.telehealth.patientIntake.goToStep);

  // Get intake data
  const intake = useQuery(
    api.modules.telehealth.patientIntake.getMyIntake,
    user?._id ? { userId: user._id } : "skip"
  );

  // Initialize intake if not exists
  useEffect(() => {
    if (user && intake === null) {
      initializeIntake({
        userId: user._id,
        email: user.email,
      });
    }
  }, [user, intake, initializeIntake]);

  // Redirect if intake is completed
  useEffect(() => {
    if (intake?.intakeCompleted) {
      // Still allow access for editing, but show completed state
    }
  }, [intake, navigate]);

  if (userLoading || intake === undefined) {
    return <FullPageSpinner />;
  }

  if (!intake) {
    return <FullPageSpinner />;
  }

  const currentStep = intake.intakeStep;
  const isCompleted = intake.intakeCompleted;

  const handleStepClick = async (step: number) => {
    if (isCompleted || step <= currentStep) {
      await goToStep({ intakeId: intake._id, step });
    }
  };

  const handleBack = async () => {
    if (currentStep > 1) {
      await goToStep({ intakeId: intake._id, step: currentStep - 1 });
    }
  };

  const handleNext = async () => {
    // Navigation is handled by individual steps after saving
  };

  const handleComplete = () => {
    navigate("/patient/dashboard");
  };

  const renderStep = () => {
    const personalData = {
      firstName: intake.firstName,
      lastName: intake.lastName,
      dateOfBirth: intake.dateOfBirth,
      sexAtBirth: intake.sexAtBirth,
      phone: intake.phone,
      email: intake.email,
      preferredLanguage: intake.preferredLanguage,
      weightLbs: intake.weightLbs,
      heightFt: intake.heightFt,
      heightIn: intake.heightIn,
    };

    const addressData = {
      street: intake.street,
      aptSuiteUnit: intake.aptSuiteUnit,
      city: intake.city,
      state: intake.state,
      zipCode: intake.zipCode,
    };

    const insuranceData = {
      insuranceProvider: intake.insuranceProvider,
      policyNumber: intake.policyNumber,
      groupNumber: intake.groupNumber,
      policyholderName: intake.policyholderName,
      relationshipToPatient: intake.relationshipToPatient,
      coverageEffectiveDate: intake.coverageEffectiveDate,
    };

    const medicalData = {
      medicalConditions: intake.medicalConditions,
      medications: intake.medications,
      allergies: intake.allergies,
      medicalHistorySkipped: intake.medicalHistorySkipped,
    };

    const consentData = {
      telehealthConsentAccepted: intake.telehealthConsentAccepted,
      hipaaConsentAccepted: intake.hipaaConsentAccepted,
    };

    switch (currentStep) {
      case 1:
        return (
          <PersonalInfoStep
            intakeId={intake._id}
            initialData={personalData}
            onBack={handleBack}
            onNext={handleNext}
          />
        );
      case 2:
        return (
          <AddressStep
            intakeId={intake._id}
            initialData={addressData}
            onBack={handleBack}
            onNext={handleNext}
          />
        );
      case 3:
        return (
          <InsuranceStep
            intakeId={intake._id}
            initialData={insuranceData}
            onBack={handleBack}
            onNext={handleNext}
          />
        );
      case 4:
        return (
          <MedicalHistoryStep
            intakeId={intake._id}
            initialData={medicalData}
            onBack={handleBack}
            onNext={handleNext}
          />
        );
      case 5:
        return (
          <ConsentStep
            intakeId={intake._id}
            initialData={consentData}
            onBack={handleBack}
            onNext={handleNext}
          />
        );
      case 6:
        return (
          <ReviewStep
            intakeId={intake._id}
            data={{
              ...personalData,
              ...addressData,
              ...insuranceData,
              ...medicalData,
              ...consentData,
            }}
            onBack={handleBack}
            onComplete={handleComplete}
            onEditStep={handleStepClick}
          />
        );
      default:
        return null;
    }
  };

  return (
    <IntakeLayout
      currentStep={currentStep}
      totalSteps={6}
      isCompleted={isCompleted}
      onStepClick={handleStepClick}
    >
      {renderStep()}
    </IntakeLayout>
  );
}
