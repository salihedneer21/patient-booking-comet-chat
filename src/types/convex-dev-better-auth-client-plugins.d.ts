import type { convex } from "@convex-dev/better-auth/plugins";

export declare const convexClient: () => {
  id: "convex";
  $InferServerPlugin: ReturnType<typeof convex>;
};
