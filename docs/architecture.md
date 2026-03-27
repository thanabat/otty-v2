# Otty V2 Architecture

## Overview

`otty-v2` is a `LINE + LIFF` employee platform. Employees access the system inside the LINE app through `LIFF`, while backend services handle identity, business APIs, webhook events, and data storage.

Primary business capabilities:

- employee profile
- workday/work schedule view
- digital business card

## Goals

- keep the stack familiar and maintainable with `TypeScript`
- separate frontend and backend responsibilities cleanly
- support LINE login and LINE webhook in the same product
- keep local development simple
- deploy web and API independently without redesign later

## Recommended Stack

### Frontend

- `Next.js`
- `TypeScript`
- `LIFF SDK`
- optional UI library later if needed

### Backend

- `Node.js`
- `TypeScript`
- `Express` or `Fastify`
- `Mongoose`
- `Zod`
- `Pino`

### Database

- `MongoDB`

### Workspace

- `npm workspaces`

## Repository Layout

```text
apps/
  web/
    src/
      app/ or pages/
      features/
      lib/
      services/
  api/
    src/
      modules/
      routes/
      middlewares/
      lib/
      config/
packages/
  shared/
    src/
      schemas/
      types/
      constants/
docs/
```

## Responsibility Split

### `apps/web`

Responsibilities:

- initialize LIFF
- handle employee-facing UI
- request employee data from API
- render profile, workday, and biz-card pages
- manage app session token on the client

Should not own:

- LINE webhook verification
- business logic
- MongoDB access
- direct trust of LIFF tokens without backend verification

### `apps/api`

Responsibilities:

- verify LINE webhook signature
- receive Messaging API webhook events
- verify LIFF identity tokens
- issue application auth/session
- expose employee APIs
- persist domain data in MongoDB
- integrate with LINE Messaging API when needed

## Runtime Model

### Local Development

Run both apps together from the root workspace:

```bash
npm run dev
```

Expected local ports:

- `web`: `3000`
- `api`: `4000`

Example local environment:

- `web` calls `http://localhost:4000`
- `api` allows `http://localhost:3000` via CORS

### Production

Deploy as two services:

- `web` on `app.<domain>`
- `api` on `api.<domain>`

LINE configuration:

- LIFF endpoint uses the `web` URL
- webhook endpoint uses the `api` URL

## High-Level Request Flows

### 1. Employee Enters LIFF App

1. User opens LIFF inside LINE.
2. `web` runs `liff.init()`.
3. `web` obtains LIFF auth context and token.
4. `web` sends token to `api`.
5. `api` verifies token and maps the LINE account to an employee.
6. `api` returns an app session or JWT.
7. `web` loads employee profile and feature data.

### 2. Employee Loads Workday Data

1. `web` calls `GET /me/workday`.
2. `api` validates app auth.
3. `api` loads the employee work schedule from MongoDB.
4. `api` returns normalized workday data for the LIFF UI.

### 3. Employee Generates or Views Business Card

1. `web` calls biz-card endpoints.
2. `api` loads employee profile fields and biz-card settings.
3. `api` returns business card data or generation result.
4. `web` renders a shareable digital card view.

### 4. LINE Sends Webhook Event

1. LINE sends event to `POST /webhooks/line`.
2. `api` verifies the channel signature.
3. `api` stores raw event metadata in `webhook_events`.
4. `api` dispatches the event to the appropriate handler.
5. `api` optionally replies or pushes messages through LINE Messaging API.

## Domain Modules

### Backend Modules

### `auth`

Responsibilities:

- verify LIFF token payload
- issue app JWT or session
- resolve current employee identity

Suggested endpoints:

- `POST /auth/liff/login`
- `GET /auth/me`
- `POST /auth/logout`

### `employees`

Responsibilities:

- employee profile CRUD for internal use
- current employee profile fetch for LIFF

Suggested endpoints:

- `GET /me/profile`
- `PATCH /me/profile`

### `workday`

Responsibilities:

- return employee work schedule
- support business rules around workday visibility

Suggested endpoints:

- `GET /me/workday`
- `GET /me/workdays`

### `biz-card`

Responsibilities:

- assemble employee public/internal card data
- manage card preferences or template metadata

Suggested endpoints:

- `GET /me/biz-card`
- `PATCH /me/biz-card`

### `line-webhook`

Responsibilities:

- receive webhook events
- validate signature
- dispatch handlers for follow, unfollow, message, postback

Suggested endpoint:

- `POST /webhooks/line`

### `health`

Suggested endpoints:

- `GET /health`
- `GET /ready`

## Frontend Feature Areas

### `auth`

- LIFF bootstrap
- login state
- session restoration

### `profile`

- show employee profile
- edit employee profile if allowed

### `workday`

- show shift/work schedule
- show current or upcoming work information

### `biz-card`

- show digital card
- share or copy card details

## MongoDB Design

### Collections

### `employees`

Purpose:

- source of truth for employee identity inside the app

Suggested fields:

- `_id`
- `employeeCode`
- `firstName`
- `lastName`
- `nickname`
- `email`
- `phone`
- `department`
- `position`
- `office`
- `avatarUrl`
- `status`
- `createdAt`
- `updatedAt`

### `line_accounts`

Purpose:

- link LINE identity to employee records

Suggested fields:

- `_id`
- `employeeId`
- `lineUserId`
- `displayName`
- `pictureUrl`
- `statusMessage`
- `linkedAt`
- `lastLoginAt`
- `createdAt`
- `updatedAt`

### `work_schedules`

Purpose:

- store employee workday information

Suggested fields:

- `_id`
- `employeeId`
- `date`
- `shiftCode`
- `startTime`
- `endTime`
- `location`
- `status`
- `notes`
- `createdAt`
- `updatedAt`

### `biz_cards`

Purpose:

- store business card presentation data and preferences

Suggested fields:

- `_id`
- `employeeId`
- `displayName`
- `title`
- `department`
- `phone`
- `email`
- `lineId`
- `avatarUrl`
- `theme`
- `qrPayload`
- `isActive`
- `updatedAt`

### `sessions`

Purpose:

- track application auth sessions or refresh tokens

Suggested fields:

- `_id`
- `employeeId`
- `tokenId`
- `expiresAt`
- `lastSeenAt`
- `userAgent`
- `ip`
- `createdAt`

### `webhook_events`

Purpose:

- store raw or normalized webhook events for debugging and audit

Suggested fields:

- `_id`
- `source`
- `eventType`
- `lineUserId`
- `payload`
- `receivedAt`
- `processedAt`
- `status`

## Auth Strategy

Recommended first version:

- LIFF initializes on the frontend
- frontend sends `idToken` to backend
- backend verifies token with LINE
- backend maps `lineUserId` to an employee
- backend issues app JWT
- frontend sends JWT in `Authorization` header

Why this version:

- simple to implement
- avoids cookie issues across separate `web` and `api` domains
- keeps identity trust on the backend

## API Design Conventions

- use `/me/*` for current employee self-service APIs
- validate every request with `Zod`
- keep route handlers thin
- place business logic in services
- place MongoDB models inside domain modules or a dedicated models layer
- version the API later only when necessary

Example route groups:

```text
/auth/*
/me/profile
/me/workday
/me/biz-card
/webhooks/line
/health
```

## Shared Package Design

`packages/shared` should contain only code shared between `web` and `api`.

Suggested contents:

- request/response DTOs
- `Zod` schemas
- enums and constants
- shared utility types

Avoid putting backend-only or frontend-only dependencies in this package.

## Root Workspace Conventions

The monorepo root should own cross-app tooling and scripts.

Expected root files:

- `package.json`
- `tsconfig.base.json`
- `.env.example`

Expected root scripts:

- `npm run dev` to run `web` and `api` together
- `npm run build` to build all packages
- `npm run lint` to lint all packages
- `npm run test` to run all tests

Suggested package naming:

- `@otty/web`
- `@otty/api`
- `@otty/shared`

## Environment Variables

### Shared Concepts

- app name
- environment
- base URLs

### API

- `PORT`
- `MONGODB_URI`
- `JWT_SECRET`
- `LINE_CHANNEL_ID`
- `LINE_CHANNEL_SECRET`
- `LINE_CHANNEL_ACCESS_TOKEN`
- `WEB_URL`

### Web

- `NEXT_PUBLIC_API_BASE_URL`
- `NEXT_PUBLIC_LIFF_ID`
- `NEXT_PUBLIC_APP_ENV`

## Security Notes

- always verify LIFF tokens on the backend
- always verify LINE webhook signatures
- do not trust client-supplied employee identity fields
- sanitize and validate every request body
- keep secrets server-side only
- add rate limiting later if public endpoints expand

## Error Handling And Observability

- structured logs with request ids
- centralized error middleware
- audit webhook failures
- include health endpoints for deployment checks

## Suggested Milestones

### Phase 1: Scaffold

- create monorepo workspace
- create `web`, `api`, and `shared`
- wire TypeScript config and linting

### Phase 2: Foundation

- configure MongoDB connection
- configure env loading
- add logger and error handling
- add health endpoints

### Phase 3: Identity

- add LIFF login flow
- add backend token verification
- create session/JWT flow
- link LINE account to employee

### Phase 4: Core Features

- implement profile feature
- implement workday feature
- implement biz-card feature

### Phase 5: LINE Integration

- add webhook endpoint
- verify signature
- persist events
- add reply handlers as needed

## Recommended Next Build Step

The monorepo scaffold should exist with:

- `apps/web` using `Next.js`
- `apps/api` using `Express`
- `packages/shared` for schemas and types

After scaffolding, verify the base runtime first:

1. install dependencies
2. boot `web` and `api` together from the root workspace
3. confirm the web landing page loads
4. confirm `GET /health` responds from the API
5. begin feature work with LIFF auth and employee profile
