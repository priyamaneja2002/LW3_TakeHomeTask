# LW3 Take-Home - Product Lifecycle Tracker

This project tracks the lifecycle of physical products in an append-only event ledger.

## Tech Stack

- Backend: Node.js, Express, MongoDB, Mongoose, JWT, express-rate-limit
- Frontend: React + Vite (minimal UI)

## Project Structure

- `backend/`: REST API and data integrity logic
- `frontend/`: minimal two-screen UI (timeline + add event)

## Setup (under 5 minutes)

### 1) Start MongoDB

If you already have MongoDB running locally, skip this step.

```bash
docker compose up -d
```

### 2) Install dependencies

```bash
npm --prefix backend install
npm --prefix frontend install
```

### 3) Configure environment variables

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Set `frontend/.env` `VITE_JWT_TOKEN` with a valid token (examples below).

### 4) Run backend + frontend

In two terminals:

```bash
npm --prefix backend run dev
npm --prefix frontend run dev
```

- Backend: `http://localhost:4000`
- Frontend: `http://localhost:5173`

## API Overview

Base path: `/api`

- `POST /products` - register product (internal only)
- `POST /products/:id/events` - append event (internal only)
- `GET /products/:id` - product with full event history
- `GET /products` - list products with filters + pagination
- `GET /products/:id/verify` - verify chain integrity

## JWT Auth

`Authorization: Bearer <token>`

Supported roles:

- `internal`: full access
- `partner`: read-only and scoped to own products

Sample payloads:

```json
{ "sub": "staff-1", "role": "internal" }
```

```json
{ "sub": "partner-user-1", "role": "partner", "partnerId": "partner-a" }
```

Generate token quickly:

```bash
node -e "console.log(require('jsonwebtoken').sign({sub:'staff-1',role:'internal'}, 'replace-with-a-strong-secret', {expiresIn:'7d'}))"
```

## Data Integrity Design

### Append-only events (enforced at data layer)

The `Event` schema blocks update/delete operations via Mongoose middleware hooks:

- `updateOne`, `updateMany`, `findOneAndUpdate`, `findByIdAndUpdate`, `replaceOne`
- `deleteOne`, `deleteMany`, `findOneAndDelete`, `findByIdAndDelete`

Result: events can only be inserted, never modified/deleted through the model.

### Event chain integrity

Each event stores:

- `previousEventId`
- `previousEventHash`
- `currentHash` (`sha256` over canonicalized event payload + chain pointers)

`GET /products/:id/verify` recomputes and validates each link in sequence.

## Performance Decisions

For `GET /products` at 100k+ scale:

- Indexes:
  - `ownerPartnerId`
  - `currentStatus`
  - `lastEventAt`
  - compound: `{ ownerPartnerId, currentStatus, lastEventAt }`
- Lean queries (`.lean()`) for list/read endpoints
- Bounded pagination (`limit <= 100`)

Implemented filters:

- `status`
- `startDate`, `endDate` (applied to `lastEventAt`)
- `partnerId` (internal users only)
- `page`, `limit`

## Rate Limiting

Role-aware limiter (15 minute window):

- Partner: `100` requests
- Internal: `1000` requests

## Minimal Frontend

Two practical screens:

1. Product timeline view (events in sequence)
2. Add event form

No auth screen by design (token is configured via env).

## Assumptions

- Product registration writes an initial lifecycle event (`manufactured` by default).
- Only internal users can mutate state (create product, append events).
- Partner users are read-only and can only access products where `ownerPartnerId === token.partnerId`.
- Event payload is flexible JSON.
- This implementation targets clarity and correctness over distributed-write complexity.

## What I would add with more time

- Cursor-based pagination for better deep-page performance at very large scale
- Transaction/optimistic concurrency strategy for high-contention event appends
- Automated tests (unit + integration) and seed fixtures
- Structured validation with a schema library (e.g. zod/joi)
- Audit metadata hardening (IP, request ID, signed actor claims)
