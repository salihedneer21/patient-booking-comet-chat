import { useState, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../../convex/_generated/dataModel";
import { SectionCard } from "../SectionCard";
import { StepNavigation } from "../StepNavigation";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText } from "lucide-react";
import toast from "react-hot-toast";

interface ConsentData {
  telehealthConsentAccepted?: boolean;
  hipaaConsentAccepted?: boolean;
}

interface ConsentStepProps {
  intakeId: Id<"patientIntake">;
  initialData: ConsentData;
  onBack: () => void;
  onNext: () => void;
}

export function ConsentStep({
  intakeId,
  initialData,
  onBack,
  onNext,
}: ConsentStepProps) {
  const [data, setData] = useState<ConsentData>(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const [telehealthModalOpen, setTelehealthModalOpen] = useState(false);
  const [hipaaModalOpen, setHipaaModalOpen] = useState(false);

  const updateConsent = useMutation(api.modules.telehealth.patientIntake.updateConsent);

  useEffect(() => {
    setData(initialData);
  }, [initialData]);

  const handleSubmit = async () => {
    if (!data.telehealthConsentAccepted) {
      toast.error("Please accept the Telehealth Informed Consent");
      return;
    }
    if (!data.hipaaConsentAccepted) {
      toast.error("Please accept the HIPAA Authorization");
      return;
    }

    setIsLoading(true);
    try {
      await updateConsent({
        intakeId,
        telehealthConsentAccepted: data.telehealthConsentAccepted,
        hipaaConsentAccepted: data.hipaaConsentAccepted,
      });
      onNext();
    } catch (error) {
      toast.error("Failed to save consent");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const canProceed = data.telehealthConsentAccepted && data.hipaaConsentAccepted;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Consent & Authorization</h1>
        <p className="text-muted-foreground">
          Please review and accept the following agreements
        </p>
      </div>

      <SectionCard title="Telehealth Informed Consent">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            This consent form covers the use of telehealth services, including video
            consultations, electronic messaging, and remote monitoring. Please read
            the full document before accepting.
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={() => setTelehealthModalOpen(true)}
          >
            <FileText className="w-4 h-4 mr-2" />
            Read Full Consent
          </Button>
          <div className="flex items-start gap-3 pt-4 border-t">
            <Checkbox
              id="telehealthConsent"
              checked={data.telehealthConsentAccepted || false}
              onCheckedChange={(checked) =>
                setData({ ...data, telehealthConsentAccepted: checked === true })
              }
            />
            <Label htmlFor="telehealthConsent" className="text-sm leading-relaxed">
              I have read and understand the Telehealth Informed Consent. I agree to
              receive healthcare services via telehealth technologies and understand
              the benefits, risks, and limitations of telehealth services.
            </Label>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="HIPAA Authorization">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            The Health Insurance Portability and Accountability Act (HIPAA) protects
            your private health information. This authorization explains how your
            information will be used and protected.
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={() => setHipaaModalOpen(true)}
          >
            <FileText className="w-4 h-4 mr-2" />
            Read HIPAA Notice
          </Button>
          <div className="flex items-start gap-3 pt-4 border-t">
            <Checkbox
              id="hipaaConsent"
              checked={data.hipaaConsentAccepted || false}
              onCheckedChange={(checked) =>
                setData({ ...data, hipaaConsentAccepted: checked === true })
              }
            />
            <Label htmlFor="hipaaConsent" className="text-sm leading-relaxed">
              I acknowledge that I have received and reviewed the Notice of Privacy
              Practices. I authorize the use and disclosure of my protected health
              information as described in the notice.
            </Label>
          </div>
        </div>
      </SectionCard>

      {/* Telehealth Consent Modal */}
      <Dialog open={telehealthModalOpen} onOpenChange={setTelehealthModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Telehealth Informed Consent</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="prose prose-sm max-w-none p-4">
              <h3>Introduction</h3>
              <p>
                Telehealth involves the use of electronic communications to enable
                healthcare providers to share individual patient medical information
                for diagnosis, therapy, follow-up, and/or patient education.
              </p>

              <h3>Benefits of Telehealth</h3>
              <ul>
                <li>Improved access to medical care</li>
                <li>Reduced travel time and waiting room exposure</li>
                <li>More convenient scheduling options</li>
                <li>Ability to receive care from the comfort of your home</li>
              </ul>

              <h3>Risks of Telehealth</h3>
              <ul>
                <li>
                  Technical difficulties may interrupt or delay your consultation
                </li>
                <li>
                  Information transmitted may not be sufficient for appropriate
                  medical decisions
                </li>
                <li>
                  Security protocols could fail, causing a breach of privacy
                </li>
                <li>
                  Delays in medical evaluation and treatment could occur due to
                  deficiencies or failures of the equipment
                </li>
              </ul>

              <h3>Your Rights</h3>
              <ul>
                <li>
                  You have the right to withhold or withdraw your consent at any time
                </li>
                <li>
                  You may request a copy of your medical records generated during
                  telehealth visits
                </li>
                <li>
                  All existing confidentiality protections apply to telehealth
                  services
                </li>
              </ul>

              <h3>By Consenting</h3>
              <p>
                By accepting this consent, you acknowledge that you understand and
                agree to the following:
              </p>
              <ul>
                <li>
                  I understand the nature of telehealth services and the benefits and
                  risks
                </li>
                <li>
                  I consent to participate in telehealth services with my healthcare
                  provider
                </li>
                <li>
                  I understand that I may decline telehealth services at any time
                </li>
              </ul>
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button onClick={() => setTelehealthModalOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* HIPAA Modal */}
      <Dialog open={hipaaModalOpen} onOpenChange={setHipaaModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Notice of Privacy Practices (HIPAA)</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="prose prose-sm max-w-none p-4">
              <h3>Our Commitment to Your Privacy</h3>
              <p>
                We are committed to protecting your health information. This notice
                describes how medical information about you may be used and disclosed
                and how you can get access to this information.
              </p>

              <h3>How We May Use Your Information</h3>
              <ul>
                <li>
                  <strong>Treatment:</strong> We may use your health information to
                  provide you with medical treatment
                </li>
                <li>
                  <strong>Payment:</strong> We may use and disclose your health
                  information to obtain payment for services
                </li>
                <li>
                  <strong>Healthcare Operations:</strong> We may use your information
                  for quality assessment and improvement activities
                </li>
              </ul>

              <h3>Your Rights</h3>
              <ul>
                <li>Request restrictions on certain uses of your information</li>
                <li>Receive confidential communications</li>
                <li>Inspect and copy your health information</li>
                <li>Request amendments to your health information</li>
                <li>Receive an accounting of disclosures</li>
                <li>Obtain a paper copy of this notice</li>
              </ul>

              <h3>Our Responsibilities</h3>
              <ul>
                <li>
                  We are required by law to maintain the privacy of your health
                  information
                </li>
                <li>
                  We will let you know promptly if a breach occurs that may have
                  compromised the privacy or security of your information
                </li>
                <li>
                  We must follow the duties and privacy practices described in this
                  notice
                </li>
              </ul>

              <h3>Contact Information</h3>
              <p>
                If you have questions about this notice or want to exercise your
                rights, please contact our Privacy Officer.
              </p>
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button onClick={() => setHipaaModalOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <StepNavigation
        currentStep={5}
        totalSteps={6}
        onBack={onBack}
        onNext={handleSubmit}
        isLoading={isLoading}
        nextDisabled={!canProceed}
      />
    </div>
  );
}
