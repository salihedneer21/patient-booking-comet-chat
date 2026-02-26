import { createAuthClient } from "better-auth/react";
import { convexClient } from "@convex-dev/better-auth/client/plugins";
import { emailOTPClient } from "better-auth/client/plugins";
import { crossDomainClient } from "@/lib/cross-domain-client";

// Get the Convex site URL
// For local dev, use VITE_CONVEX_SITE_URL if available, otherwise derive from VITE_CONVEX_URL
// For production: https://abc-123.convex.cloud -> https://abc-123.convex.site
const convexUrl = import.meta.env.VITE_CONVEX_URL as string;
const convexSiteUrlEnv = import.meta.env.VITE_CONVEX_SITE_URL as string | undefined;

export const convexSiteUrl = convexSiteUrlEnv
  ? // Use explicit site URL if provided
    convexSiteUrlEnv
  : convexUrl?.includes("127.0.0.1") || convexUrl?.includes("localhost")
    ? // Local dev: increment port by 1 (3210 -> 3211, 3212 -> 3213)
      convexUrl.replace(/:(\d+)$/, (_, port) => `:${parseInt(port) + 1}`)
    : // Production: replace .convex.cloud with .convex.site
      convexUrl?.replace(".convex.cloud", ".convex.site");

export const authClient = createAuthClient({
  baseURL: convexSiteUrl,
  plugins: [
    convexClient(),
    crossDomainClient(),
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
