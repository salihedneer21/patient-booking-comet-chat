# Telehealth Module

This module provides patient intake, appointment scheduling, provider workflows, EMR-lite (encounters + SOAP), and CometChat-powered messaging + video sessions.

## Backend

- Schema: `convex/modules/telehealth/_schema.ts`
- Functions: `convex/modules/telehealth/*.ts`

## Frontend

- Pages: `src/pages/modules/telehealth/**`
- Shared CometChat + video components: `src/components/modules/telehealth/shared/**`

## Environment

Client (`.env.local`):
- `VITE_COMETCHAT_APP_ID`
- `VITE_COMETCHAT_REGION`

Server (Convex env):
- `COMETCHAT_APP_ID`
- `COMETCHAT_API_KEY`
- `COMETCHAT_REGION`

## Security Model

- Convex functions enforce role and record-level access.
- CometChat auth uses server-generated auth tokens; no CometChat auth key is required in the browser.

