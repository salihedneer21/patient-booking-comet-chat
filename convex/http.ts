import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { authClient, createAuth } from "./auth";

const http = httpRouter();

// Allowed origins for CORS
const allowedOrigins = [
  process.env.SITE_URL ?? "http://localhost:5173",
  "http://localhost:5173",
  "http://localhost:3000",
  "https://patient-booking-comet-chat.vercel.app",
];

// Helper to check if origin is allowed
function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  return allowedOrigins.includes(origin) ||
         origin.endsWith(".vercel.app") ||
         origin.includes("localhost");
}

// Helper to get CORS headers
function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowedOrigin = isAllowedOrigin(origin) ? origin! : allowedOrigins[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With, Better-Auth-Cookie",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Expose-Headers": "Set-Better-Auth-Cookie",
    "Access-Control-Max-Age": "86400",
  };
}

// Manual CORS preflight handler for auth routes
http.route({
  path: "/api/auth/get-session",
  method: "OPTIONS",
  handler: httpAction(async (_, request) => {
    const origin = request.headers.get("origin");
    return new Response(null, {
      status: 204,
      headers: getCorsHeaders(origin),
    });
  }),
});

http.route({
  path: "/api/auth/sign-in/email",
  method: "OPTIONS",
  handler: httpAction(async (_, request) => {
    const origin = request.headers.get("origin");
    return new Response(null, {
      status: 204,
      headers: getCorsHeaders(origin),
    });
  }),
});

http.route({
  path: "/api/auth/sign-up/email",
  method: "OPTIONS",
  handler: httpAction(async (_, request) => {
    const origin = request.headers.get("origin");
    return new Response(null, {
      status: 204,
      headers: getCorsHeaders(origin),
    });
  }),
});

http.route({
  path: "/api/auth/sign-out",
  method: "OPTIONS",
  handler: httpAction(async (_, request) => {
    const origin = request.headers.get("origin");
    return new Response(null, {
      status: 204,
      headers: getCorsHeaders(origin),
    });
  }),
});

// Catch-all OPTIONS handler for any /api/auth/* route
http.route({
  pathPrefix: "/api/auth/",
  method: "OPTIONS",
  handler: httpAction(async (_, request) => {
    const origin = request.headers.get("origin");
    return new Response(null, {
      status: 204,
      headers: getCorsHeaders(origin),
    });
  }),
});

// Register Better Auth routes WITHOUT cors (we handle it manually above)
authClient.registerRoutes(http, createAuth);

export default http;
