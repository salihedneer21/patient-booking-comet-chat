import { httpRouter } from "convex/server";
import { authClient, createAuth } from "./auth";

const http = httpRouter();

// Explicit allowed origins for CORS
const siteUrl = process.env.SITE_URL ?? "http://localhost:5173";
const allowedOrigins = [
  siteUrl,
  "http://localhost:5173",
  "http://localhost:3000",
  "https://patient-booking-comet-chat.vercel.app",
];

// Register Better Auth routes with CORS enabled
authClient.registerRoutes(http, createAuth, {
  cors: {
    allowedOrigins,
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Better-Auth-Cookie"],
  },
});

export default http;
