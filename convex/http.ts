import { httpRouter } from "convex/server";
import { authClient, createAuth } from "./auth";

const http = httpRouter();

// Register Better Auth routes with CORS enabled
// Now that env vars are set in prod, the library's CORS handling should work
authClient.registerRoutes(http, createAuth, {
  cors: {
    allowedOrigins: [
      "https://patient-booking-comet-chat.vercel.app",
      "http://localhost:5173",
      "http://localhost:3000",
    ],
  },
});

export default http;
