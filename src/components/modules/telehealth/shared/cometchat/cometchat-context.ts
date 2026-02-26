import { createContext, useContext } from "react";

export interface CometChatContextValue {
  isInitialized: boolean;
  isLoggedIn: boolean;
  isLoading: boolean;
  error: string | null;
}

export const CometChatContext = createContext<CometChatContextValue>({
  isInitialized: false,
  isLoggedIn: false,
  isLoading: true,
  error: null,
});

export function useCometChat() {
  return useContext(CometChatContext);
}

