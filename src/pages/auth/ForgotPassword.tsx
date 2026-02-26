import { useState } from "react";
import RequestResetForm from "@/components/auth/RequestResetForm";
import ResetPasswordForm from "@/components/auth/ResetPasswordForm";
import { Card, CardContent } from "@/components/ui/card";

export default function ForgotPassword() {
  const [sentToEmail, setSentToEmail] = useState<string | null>(null);

  return (
    <Card className="w-full md:max-w-[500px]">
      <CardContent className="pt-6">
        {sentToEmail ? (
          <ResetPasswordForm
            email={sentToEmail}
            onBack={() => setSentToEmail(null)}
          />
        ) : (
          <RequestResetForm onSuccess={setSentToEmail} />
        )}
      </CardContent>
    </Card>
  );
}
