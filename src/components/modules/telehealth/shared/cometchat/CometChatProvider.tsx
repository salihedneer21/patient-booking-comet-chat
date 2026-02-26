import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useAction } from "convex/react";
import { useCurrentUser } from "@/lib/useCurrentUser";
import {
  initializeCometChat,
  getLoggedInCometChatUser,
  loginToCometChatWithAuthToken,
  logoutFromCometChat,
  isCometChatInitialized,
} from "@/lib/cometchat";
import { api } from "../../../../../../convex/_generated/api";
import { CometChatContext } from "./cometchat-context";

interface CometChatProviderProps {
  children: ReactNode;
}

export function CometChatProvider({ children }: CometChatProviderProps) {
  const { user, isAuthenticated, isLoading: isAuthLoading } = useCurrentUser();
  const getMyAuthToken = useAction(api.modules.telehealth.cometchat.getMyAuthToken);
  const [isInitialized, setIsInitialized] = useState(isCometChatInitialized());
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const loginInProgressRef = useRef(false);

  // Initialize CometChat UIKit on mount
  useEffect(() => {
    const init = async () => {
      if (!isInitialized) {
        try {
          const success = await initializeCometChat();
          setIsInitialized(success);
          if (!success) {
            setError(
              "CometChat is not configured. Set VITE_COMETCHAT_APP_ID (Vite) and COMETCHAT_* (Convex env).",
            );
          }
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed to initialize CometChat");
        }
      }
      setIsLoading(false);
    };

    init();
  }, [isInitialized]);

  // Login/logout CometChat when app auth changes
  useEffect(() => {
    // Wait for both CometChat init and auth loading to complete
    if (!isInitialized || isAuthLoading) return;

    let cancelled = false;

    const syncAuth = async () => {
      // Avoid overlapping login attempts (StrictMode mounts twice in dev).
      if (loginInProgressRef.current) return;

      if (isAuthenticated && user?.isActive) {
        loginInProgressRef.current = true;
        setIsLoading(true);
        setError(null);
        try {
          const existing = await getLoggedInCometChatUser();
          if (existing) {
            if (!cancelled) {
              setIsLoggedIn(true);
            }
            return;
          }

          const { authToken } = await getMyAuthToken();
          const cometUser = await loginToCometChatWithAuthToken(authToken);
          if (!cancelled) {
            setIsLoggedIn(!!cometUser);
            if (!cometUser) {
              setError("Failed to sign in to CometChat");
            }
          }
        } catch (err) {
          if (!cancelled) {
            setIsLoggedIn(false);
            setError(err instanceof Error ? err.message : "Failed to sign in to CometChat");
          }
        } finally {
          loginInProgressRef.current = false;
          if (!cancelled) setIsLoading(false);
        }
      } else if (!isAuthenticated) {
        // Ensure CometChat session doesn't outlive app auth.
        setIsLoading(true);
        setError(null);
        try {
          const existing = await getLoggedInCometChatUser();
          if (existing) {
            await logoutFromCometChat();
          }
        } finally {
          if (!cancelled) {
            setIsLoggedIn(false);
            setIsLoading(false);
          }
        }
      } else {
        // Inactive user – don't auto-connect CometChat.
        setIsLoggedIn(false);
        setIsLoading(false);
      }
    };

    void syncAuth();
    return () => {
      cancelled = true;
    };
  }, [getMyAuthToken, isAuthenticated, isAuthLoading, isInitialized, user?.isActive]);

  return (
    <CometChatContext.Provider value={{ isInitialized, isLoggedIn, isLoading, error }}>
      {children}
    </CometChatContext.Provider>
  );
}
