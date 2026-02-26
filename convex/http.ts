import { httpRouter } from "convex/server";
import { authClient, createAuth } from "./auth";

const http = httpRouter();

// Register Better Auth routes with CORS enabled for all origins
// The trustedOrigins in auth.ts handles the actual security
authClient.registerRoutes(http, createAuth, {
  cors: {
    allowedOrigins: ["*"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  },
});

export default http;
