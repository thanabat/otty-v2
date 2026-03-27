# otty-v2

This repository is planned as a `LINE + LIFF` employee platform built with `TypeScript`, `MongoDB`, and a two-app setup:

- `apps/web`: LIFF frontend for employees
- `apps/api`: backend API, LINE webhook, and business logic

Read this file first for repo context. Read [docs/architecture.md](/Users/hellmonster/Documents/Coding/Work/otty-v2/docs/architecture.md) next for the detailed system design.

## Project Intent

The product is an internal employee system inside LINE. Core features:

- employee profile
- workday/work schedule view
- digital business card

The main UX entrypoint is `LIFF` inside the LINE app. The backend also handles `LINE Messaging API` webhook events and application data storage in `MongoDB`.

## Architecture Direction

The repo should be implemented as a small monorepo:

```text
apps/
  web/
  api/
packages/
  shared/
docs/
```

Recommended stack:

- frontend: `Next.js` + `TypeScript` + `LIFF SDK`
- backend: `Express` or `Fastify` + `TypeScript`
- database: `MongoDB` + `Mongoose`
- shared validation/types: `Zod`
- workspace tooling: `npm workspaces`

## Why Two Apps

The project intentionally separates `web` and `api`.

`apps/web` is responsible for:

- LIFF bootstrap
- employee-facing pages
- authenticated calls to backend APIs

`apps/api` is responsible for:

- LINE webhook endpoint
- LIFF token verification and app auth
- employee profile APIs
- workday APIs
- business card APIs
- MongoDB persistence

This keeps webhook logic and frontend rendering separate, which is simpler to maintain once the product grows.

## Local Development Expectation

Even with two apps, local development should feel like one project.

The root workspace is expected to provide commands such as:

```bash
npm install
npm run dev
npm run build
npm run lint
npm run test
```

`npm run dev` should run both `web` and `api` together from the repo root.

Example local URLs:

- `web`: `http://localhost:3000`
- `api`: `http://localhost:4000`

## Deployment Expectation

Deploy the two apps as separate services:

- `web`: `https://app.example.com`
- `api`: `https://api.example.com`

LINE integration mapping:

- LIFF URL points to `web`
- LINE webhook URL points to `api`

Deployment is not a problem with this setup as long as these are defined clearly:

- environment variables
- API base URL
- CORS policy
- auth/token verification flow

## Suggested Auth Flow

Use `LIFF` for user sign-in and let the backend verify identity.

High-level flow:

1. User opens the LIFF app inside LINE.
2. `web` initializes LIFF and retrieves `idToken` or LINE access context.
3. `web` sends the token to `api`.
4. `api` verifies the token and resolves the employee identity.
5. `api` creates an app session or returns a signed JWT.
6. `web` uses that session/token for subsequent requests.

This avoids fragile cross-domain cookie behavior early in the project.

## Core Domain Modules

Planned backend modules:

- `auth`
- `line-liff`
- `line-webhook`
- `employees`
- `workday`
- `biz-card`
- `sessions`
- `config`
- `health`

Planned frontend modules:

- `auth`
- `profile`
- `workday`
- `biz-card`
- `shared ui`

## Initial Data Model

Expected MongoDB collections:

- `employees`
- `line_accounts`
- `work_schedules`
- `biz_cards`
- `sessions`
- `webhook_events`

## Implementation Rules For AI Agents

When generating code for this repository:

- preserve the `apps/web`, `apps/api`, `packages/shared` structure
- keep the project in `TypeScript`
- prefer clear module boundaries over framework tricks
- treat LIFF auth and LINE webhook handling as backend concerns
- avoid putting business logic directly in controllers or route files
- keep MongoDB models close to domain modules
- define shared DTOs and schemas in `packages/shared`
- favor simple, explicit code over abstractions too early

## Current Status

Current repository state:

- monorepo scaffold created
- `apps/web` bootstrapped with a basic Next.js entry page
- `apps/api` bootstrapped with Express and health endpoints
- `packages/shared` created for shared constants and types
- feature modules are not implemented yet

Next recommended step:

1. run `npm install`
2. copy `apps/web/.env.example` and `apps/api/.env.example` into local env files
3. run `npm run dev`
4. verify `http://localhost:3000` and `http://localhost:4000/health`
5. start feature implementation from auth and employee profile
