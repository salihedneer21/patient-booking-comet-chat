import { useState } from "react";
import { Link } from "react-router-dom";
import AuthForm from "@/components/auth/AuthForm";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Register() {
  const [agreed, setAgreed] = useState(false);

  return (
    <Card className="w-full md:max-w-[500px]">
      <CardHeader className="text-center">
        <CardTitle className="font-heading text-2xl">Create your account</CardTitle>
        <CardDescription>
          Sign up to get started with your health journey
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <AuthForm
          mode="signUp"
          disableSubmit={!agreed}
          beforeSubmit={
            <div className="flex items-start space-x-2">
              <Checkbox
                id="terms"
                checked={agreed}
                onCheckedChange={(checked: boolean) => setAgreed(checked)}
                className="mt-1"
              />
              <label
                htmlFor="terms"
                className="text-sm font-light text-foreground leading-5"
              >
                I have read and agreed to the{" "}
                <Link
                  to="/policies/refund"
                  className="underline text-foreground hover:text-foreground/80 cursor-pointer"
                >
                  refund policy
                </Link>
                , the{" "}
                <Link
                  to="/policies/terms"
                  className="underline text-foreground hover:text-foreground/80 cursor-pointer"
                >
                  terms and conditions
                </Link>
                , and the{" "}
                <Link
                  to="/policies/privacy"
                  className="underline text-foreground hover:text-foreground/80 cursor-pointer"
                >
                  privacy policy
                </Link>
                .
              </label>
            </div>
          }
        />

        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              to="/login"
              className="font-medium text-primary hover:text-primary/80 cursor-pointer"
            >
              Log in here
            </Link>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
