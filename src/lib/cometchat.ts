import { CometChat } from "@cometchat/chat-sdk-javascript";
import { CometChatCalls } from "@cometchat/calls-sdk-javascript";
import { CometChatUIKit, UIKitSettingsBuilder } from "@cometchat/chat-uikit-react";

const appID = import.meta.env.VITE_COMETCHAT_APP_ID || "";
const region = import.meta.env.VITE_COMETCHAT_REGION || "us";
const authKey = import.meta.env.VITE_COMETCHAT_AUTH_KEY || "";

let isInitialized = false;

/**
 * Initialize CometChat UIKit
 * Call this once on app load
 */
export async function initializeCometChat(): Promise<boolean> {
  if (isInitialized) {
    return true;
  }

  if (!appID) {
    console.warn(
      "CometChat credentials not configured. Set VITE_COMETCHAT_APP_ID in your Vite env and COMETCHAT_* in Convex env.",
    );
    return false;
  }

  try {
    const uiKitSettings = new UIKitSettingsBuilder()
      .setAppId(appID)
      .setRegion(region)
      .setAuthKey(authKey)
      .subscribePresenceForAllUsers()
      .build();

    await CometChatUIKit.init(uiKitSettings);
    console.log("CometChat UIKit initialized successfully");

    // Initialize Calls SDK directly from the package
    const callAppSettings = new CometChatCalls.CallAppSettingsBuilder()
      .setAppId(appID)
      .setRegion(region)
      .build();

    await CometChatCalls.init(callAppSettings);
    console.log("CometChat Calls SDK initialized successfully");

    isInitialized = true;
    return true;
  } catch (error) {
    console.error("CometChat initialization failed:", error);
    return false;
  }
}

/**
 * Generate a CometChat-compatible UID from user ID
 * CometChat UIDs can only contain alphanumeric, underscore, and hyphen
 */
export function generateCometChatUid(userId: string): string {
  return userId.replace(/[^a-zA-Z0-9_-]/g, "_");
}

/**
 * Login to CometChat with a server-issued auth token.
 *
 * For production, do not use an Auth Key on the client. Generate auth tokens
 * on the server (Convex action) and log in with `loginWithAuthToken`.
 */
export async function loginToCometChatWithAuthToken(
  authToken: string,
): Promise<CometChat.User | null> {
  if (!isInitialized) {
    console.warn("CometChat not initialized");
    return null;
  }

  try {
    const user = await CometChatUIKit.loginWithAuthToken(authToken);
    return user;
  } catch (error) {
    console.error("CometChat loginWithAuthToken failed:", error);
    return null;
  }
}

/**
 * Logout from CometChat
 */
export async function logoutFromCometChat(): Promise<void> {
  if (!isInitialized) {
    return;
  }

  try {
    await CometChatUIKit.logout();
    console.log("CometChat logout successful");
  } catch (error) {
    console.error("CometChat logout failed:", error);
  }
}

/**
 * Get currently logged in CometChat user
 */
export async function getLoggedInCometChatUser(): Promise<CometChat.User | null> {
  if (!isInitialized) {
    return null;
  }

  try {
    const user = await CometChat.getLoggedinUser();
    return user;
  } catch {
    return null;
  }
}

/**
 * Check if CometChat is initialized
 */
export function isCometChatInitialized(): boolean {
  return isInitialized;
}

/**
 * Get CometChat user by UID
 */
export async function getCometChatUser(uid: string): Promise<CometChat.User | null> {
  if (!isInitialized) {
    return null;
  }

  try {
    const user = await CometChat.getUser(uid);
    return user;
  } catch {
    return null;
  }
}
