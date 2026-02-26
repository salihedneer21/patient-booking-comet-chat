# codex-telehealth-cometchat

Production-ready telehealth platform (Patient / Provider / Admin) built with **Vite + React + Convex + Better Auth**, integrating **CometChat** for real-time messaging and video calls.

## Features

- Three-role auth: patient, provider, admin
- Patient intake (6-step wizard)
- Appointment scheduling + provider availability
- CometChat messaging (patient/provider/admin)
- CometChat video sessions with waiting room (`/call/:sessionId`)
- EMR-lite: encounters + SOAP notes + medical history tables
- Server-side authorization enforced in Convex (no client-only security)

## Local Setup

### 1) Install deps

```bash
pnpm install
```

### 2) Configure client env

Copy `.env.example` → `.env.local`, then set at minimum:

- `VITE_CONVEX_URL`
- `VITE_COMETCHAT_APP_ID`
- `VITE_COMETCHAT_REGION`

### 3) Start Convex + generate types

```bash
npx convex dev
```

### 4) Set required Convex env vars

```bash
npx convex env set BETTER_AUTH_SECRET "your-secret-key-must-be-at-least-32-characters-long"
npx convex env set SITE_URL "http://localhost:5173"

# CometChat (server-side)
npx convex env set COMETCHAT_APP_ID "your_app_id"
npx convex env set COMETCHAT_API_KEY "your_api_key"
npx convex env set COMETCHAT_REGION "us"
```

Optional (email OTP):

```bash
npx convex env set RESEND_API_KEY "your_resend_key"
npx convex env set AUTH_EMAIL "noreply@yourdomain.com"
```

### 5) Seed an admin user

```bash
npx convex run seed/admin:seedAdmin
```

Admin credentials: `admin1@gmail.com` / `adminadmin`

Seed functions are `internalAction`/`internalMutation` and are not callable from the client app.

### 6) Run the app

```bash
pnpm dev
```

Opens at `http://localhost:5173`

## Notes

- Patients self-register at `/register` (role always `patient`).
- Providers are managed by admins (current UI promotes an existing user to `provider`).
- CometChat auth uses **server-generated auth tokens** (`COMETCHAT_API_KEY`) — no CometChat auth key is required in the browser.
- TypeScript stubs for `@convex-dev/better-auth` live in `src/types/` to keep `tsc -b` passing with strict settings.
