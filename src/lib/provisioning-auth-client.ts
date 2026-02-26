import { createAuthClient } from "better-auth/react";
import { convexClient } from "@convex-dev/better-auth/client/plugins";
import { emailOTPClient } from "better-auth/client/plugins";
import { crossDomainClient } from "@/lib/cross-domain-client";
import { convexSiteUrl } from "@/lib/auth-client";

export const provisioningAuthClient = createAuthClient({
  baseURL: convexSiteUrl,
  plugins: [
    convexClient(),
    crossDomainClient({
      storagePrefix: "better-auth-provisioning",
      disableCache: true,
    }),
    emailOTPClient(),
  ] as [
    ReturnType<typeof convexClient>,
    ReturnType<typeof crossDomainClient>,
    ReturnType<typeof emailOTPClient>,
  ],
  sessionOptions: {
    refetchOnWindowFocus: false,
    refetchInterval: 0,
  },
});

