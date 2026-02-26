import { v } from "convex/values";
import { action, mutation } from "../../_generated/server";
import { api } from "../../_generated/api";
import { getViewerOrThrow, isAdmin, requireActiveUser } from "../../lib/auth";

const userRoleValidator = v.union(
  v.literal("patient"),
  v.literal("provider"),
  v.literal("admin"),
);

function sanitizeCometChatUid(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9_-]/g, "_");
}

function getCometChatConfig() {
  const appId = process.env.COMETCHAT_APP_ID;
  const apiKey = process.env.COMETCHAT_API_KEY;
  const region = process.env.COMETCHAT_REGION;

  if (!appId || !apiKey || !region) {
    throw new Error(
      "CometChat server credentials are not configured. Set COMETCHAT_APP_ID, COMETCHAT_API_KEY, and COMETCHAT_REGION in Convex env.",
    );
  }

  return { appId, apiKey, region };
}

function getAdminApiBaseUrl(config: { appId: string; region: string }): string {
  // Align with the Chat SDK’s admin API versioning (v3.0).
  return `https://${config.appId}.api-${config.region}.cometchat.io/v3.0`;
}

async function createOrUpdateCometChatUser(args: {
  uid: string;
  name: string;
  role: "patient" | "provider" | "admin";
}) {
  const { appId, apiKey, region } = getCometChatConfig();
  const baseUrl = getAdminApiBaseUrl({ appId, region });
  const headers = {
    Accept: "application/json",
    "Content-Type": "application/json",
    apikey: apiKey,
    appId,
  };

  // Create user (idempotent-ish: ignore “already exists” errors)
  const createResp = await fetch(`${baseUrl}/users`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      uid: args.uid,
      name: args.name,
      metadata: { role: args.role },
    }),
  });

  if (!createResp.ok) {
    const createJson = await createResp.json().catch(() => null);
    const errorCode: string | undefined =
      createJson?.error?.code ??
      createJson?.code ??
      createJson?.error?.error_code ??
      createJson?.errorCode;
    const message: string | undefined =
      createJson?.error?.message ?? createJson?.message ?? createResp.statusText;

    // If the user already exists, proceed. Otherwise fail fast.
    const alreadyExists =
      errorCode === "ERR_UID_ALREADY_EXISTS" ||
      errorCode === "ERR_UID_ALREADY_TAKEN" ||
      errorCode === "ERR_UID_ALREADY_IN_USE";

    if (!alreadyExists) {
      throw new Error(
        `CometChat user create failed (${createResp.status}): ${message ?? "Unknown error"}`,
      );
    }
  }

  // Best-effort update to keep name/metadata in sync (ignore failures)
  await fetch(`${baseUrl}/users/${encodeURIComponent(args.uid)}`, {
    method: "PUT",
    headers,
    body: JSON.stringify({
      name: args.name,
      metadata: { role: args.role },
    }),
  }).catch(() => undefined);
}

async function generateAuthToken(uid: string): Promise<string> {
  const { appId, apiKey, region } = getCometChatConfig();
  const baseUrl = getAdminApiBaseUrl({ appId, region });
  const headers = {
    Accept: "application/json",
    "Content-Type": "application/json",
    apikey: apiKey,
    appId,
  };

  const resp = await fetch(
    `${baseUrl}/users/${encodeURIComponent(uid)}/auth_tokens`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({}),
    },
  );

  const json = await resp.json().catch(() => null);
  if (!resp.ok) {
    const message: string | undefined =
      json?.error?.message ?? json?.message ?? resp.statusText;
    throw new Error(
      `CometChat auth token generation failed (${resp.status}): ${message ?? "Unknown error"}`,
    );
  }

  const authToken: string | undefined =
    json?.data?.authToken ?? json?.authToken ?? json?.data?.token ?? json?.token;

  if (!authToken) {
    throw new Error("CometChat auth token missing in response");
  }

  return authToken;
}

export const upsertUserMapping = mutation({
  args: {
    userId: v.id("users"),
    cometChatUid: v.string(),
    role: userRoleValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { user: viewer } = await getViewerOrThrow(ctx);
    requireActiveUser(viewer);

    if (!isAdmin(viewer) && viewer._id !== args.userId) {
      throw new Error("Forbidden");
    }

    const expectedUid = sanitizeCometChatUid(args.userId);
    if (args.cometChatUid !== expectedUid) {
      throw new Error("Forbidden");
    }
    if (!isAdmin(viewer) && args.role !== viewer.role) {
      throw new Error("Forbidden");
    }

    const existing = await ctx.db
      .query("cometChatUsers")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique();

    if (existing) {
      if (
        existing.cometChatUid !== args.cometChatUid ||
        existing.role !== args.role
      ) {
        await ctx.db.patch(existing._id, {
          cometChatUid: args.cometChatUid,
          role: args.role,
        });
      }
    } else {
      await ctx.db.insert("cometChatUsers", {
        userId: args.userId,
        cometChatUid: args.cometChatUid,
        role: args.role,
        createdAt: Date.now(),
      });
    }

    // Keep profile records in sync when present (best-effort).
    if (args.role === "patient") {
      const intake = await ctx.db
        .query("patientIntake")
        .withIndex("by_userId", (q) => q.eq("userId", args.userId))
        .unique();
      if (intake && intake.cometChatUid !== args.cometChatUid) {
        await ctx.db.patch(intake._id, {
          cometChatUid: args.cometChatUid,
          updatedAt: Date.now(),
        });
      }
    } else if (args.role === "provider") {
      const profile = await ctx.db
        .query("providerProfiles")
        .withIndex("by_userId", (q) => q.eq("userId", args.userId))
        .unique();
      if (profile && profile.cometChatUid !== args.cometChatUid) {
        await ctx.db.patch(profile._id, {
          cometChatUid: args.cometChatUid,
          updatedAt: Date.now(),
        });
      }
    }

    return null;
  },
});

export const getMyAuthToken = action({
  args: {},
  returns: v.object({ uid: v.string(), authToken: v.string() }),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }
    if (!identity.email) {
      throw new Error("Missing email in identity");
    }

    // Ensure we have an app user record (patients can self-register).
    const user =
      (await ctx.runQuery(api.users.getCurrentUser, {
        betterAuthUserId: identity.subject,
      })) ??
      (await ctx.runMutation(api.users.getOrCreateUser, {
        betterAuthUserId: identity.subject,
        email: identity.email,
        name: identity.name ?? undefined,
      }));

    if (!user.isActive) {
      throw new Error("Account inactive");
    }

    const cometChatUid = sanitizeCometChatUid(user._id);
    const displayName = user.name ?? user.email;

    await ctx.runMutation(api.modules.telehealth.cometchat.upsertUserMapping, {
      userId: user._id,
      cometChatUid,
      role: user.role,
    });

    await createOrUpdateCometChatUser({
      uid: cometChatUid,
      name: displayName,
      role: user.role,
    });

    const authToken = await generateAuthToken(cometChatUid);

    return { uid: cometChatUid, authToken };
  },
});
