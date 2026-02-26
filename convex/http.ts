import { httpRouter } from "convex/server";
import { authClient, createAuth } from "./auth";

const http = httpRouter();

// Register Better Auth routes with CORS enabled
authClient.registerRoutes(http, createAuth, { cors: true });

export default http;
