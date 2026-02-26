import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "@cometchat/chat-uikit-react/css-variables.css";
import { RouterProvider } from "react-router-dom";
import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import { router } from "./router.tsx";
import { convex, isConvexConfigured } from "./lib/convex.ts";
import { authClient } from "./lib/auth-client.ts";
import { ThemeProvider } from "./lib/theme-provider.tsx";
import { TooltipProvider } from "./components/ui/tooltip.tsx";
import { Toaster } from "./components/ui/sonner.tsx";
import { CometChatProvider } from "./components/modules/telehealth/shared/cometchat/index.ts";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <TooltipProvider>
        {isConvexConfigured ? (
          <ConvexBetterAuthProvider client={convex} authClient={authClient}>
            <CometChatProvider>
              <RouterProvider router={router} />
              <Toaster richColors position="top-right" />
            </CometChatProvider>
          </ConvexBetterAuthProvider>
        ) : (
          <>
            <RouterProvider router={router} />
            <Toaster richColors position="top-right" />
          </>
        )}
      </TooltipProvider>
    </ThemeProvider>
  </StrictMode>
);
