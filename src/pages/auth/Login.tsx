import { Link } from "react-router-dom";
import AuthForm from "@/components/auth/AuthForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Login() {
  return (
    <Card className="w-full md:max-w-[500px]">
      <CardHeader className="text-center">
        <CardTitle className="font-heading text-2xl">Welcome back</CardTitle>
        <CardDescription>
          Use your credentials to access your account
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <AuthForm
          mode="signIn"
          beforeSubmit={
            <div className="flex items-center justify-end">
              <Link
                to="/forgot-password"
                className="text-sm font-medium text-primary hover:text-primary/80 cursor-pointer"
              >
                Forgot Password?
              </Link>
            </div>
          }
        />

        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link
              to="/register"
              className="font-medium text-primary hover:text-primary/80 cursor-pointer"
            >
              Sign up now
            </Link>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
