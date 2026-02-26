"use node";

import { internalAction } from "../_generated/server";
import { v } from "convex/values";
import { internal, components } from "../_generated/api";
import { hashPassword } from "better-auth/crypto";

const ADMIN_EMAIL = "admin1@gmail.com";
const ADMIN_PASSWORD = "adminadmin";

// Seed the admin user - run with: npx convex run seed/admin:seedAdmin
export const seedAdmin = internalAction({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    // Check if admin already exists
    const existingUser = await ctx.runQuery(internal.seed.helpers.checkAdminExists, {
      email: ADMIN_EMAIL,
    });

    if (existingUser) {
      console.log("Admin user already exists");
      return null;
    }

    // Hash the password using Better Auth's crypto
    const hashedPassword = await hashPassword(ADMIN_PASSWORD);
    const oddsId = crypto.randomUUID();
    const now = Date.now();

    // Create user in Better Auth via component adapter
    await ctx.runMutation(components.betterAuth.adapter.create, {
      input: {
        model: "user",
        data: {
          email: ADMIN_EMAIL,
          name: "Admin",
          emailVerified: true,
          createdAt: now,
          updatedAt: now,
          userId: oddsId,
        },
      },
      select: ["_id"],
    });

    // Get the created user's _id to use as the account's userId
    const createdUser = await ctx.runQuery(internal.seed.helpers.getBetterAuthUser, {
      email: ADMIN_EMAIL,
    });

    if (!createdUser) {
      console.error("Failed to create user in Better Auth");
      return null;
    }

    // Create account for credential login
    await ctx.runMutation(components.betterAuth.adapter.create, {
      input: {
        model: "account",
        data: {
          accountId: createdUser._id,
          providerId: "credential",
          userId: createdUser._id,
          password: hashedPassword,
          createdAt: now,
          updatedAt: now,
        },
      },
      select: ["_id"],
    });

    // Create admin in our users table
    await ctx.runMutation(internal.seed.helpers.createAdminInUsersTable, {
      betterAuthUserId: createdUser._id,
      email: ADMIN_EMAIL,
    });

    console.log("=".repeat(50));
    console.log("SUCCESS: Admin user created!");
    console.log(`Email: ${ADMIN_EMAIL}`);
    console.log(`Password: ${ADMIN_PASSWORD}`);
    console.log("=".repeat(50));

    return null;
  },
});
