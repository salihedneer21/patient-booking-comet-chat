// NOTE: This project uses `@convex-dev/better-auth`, but the published typings
// currently reference the package’s `src/*.ts` sources. With `tsc -b` and
// strict settings enabled, TypeScript ends up type-checking those dependency
// sources and fails the build.
//
// These local type stubs keep the app production builds working while avoiding
// coupling to upstream internal source typings. Prefer upgrading
// `@convex-dev/better-auth` and removing these stubs when the package ships
// self-contained `.d.ts` files.

export type GenericCtx<TDataModel = unknown> = any;
export type CreateAuth = any;
export type EventFunction = any;
export type Triggers = any;
export type AuthFunctions = any;

export const createClient: any;
export const convexAdapter: any;
export const createApi: any;

