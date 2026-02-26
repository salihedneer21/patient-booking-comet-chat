import { httpRouter } from "convex/server";
import { authClient, createAuth } from "./auth";

const http = httpRouter();

// Get allowed origins for CORS
const siteUrl = process.env.SITE_URL ?? "http://localhost:5173";
const allowedOrigins = [
  siteUrl,
  "http://localhost:5173",
  "http://localhost:3000",
];

// Add any explicit trusted origins from env
if (process.env.BETTER_AUTH_TRUSTED_ORIGINS) {
  const explicit = process.env.BETTER_AUTH_TRUSTED_ORIGINS.split(",").map(
    (o) => o.trim()
  );
  allowedOrigins.push(...explicit);
}

// Register Better Auth routes with CORS enabled
authClient.registerRoutes(http, createAuth, {
  cors: {
    allowedOrigins,
  },
});

export default http;
