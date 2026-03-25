# bkkjs-demo

A hands-on demonstration of **Domain-Driven Design (DDD)** and **clean/hexagonal architecture** in TypeScript, built on Bun and Elysia. The feature implemented is user registration — small enough to follow end-to-end, but complete enough to showcase the key patterns: aggregate roots, value objects, a unit of work, a repository, a domain event bus, and the **transactional outbox pattern** backed by [pg-boss](https://github.com/timgit/pg-boss).

---

## Contents

- [Key Concepts](#key-concepts)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [API Endpoints](#api-endpoints)
- [Architecture Overview](#architecture-overview)
- [Environment Variables](#environment-variables)

---

## Key Concepts

### Domain-Driven Design layers

The codebase is split into three layers, each with a strict dependency rule — inner layers never import from outer ones:

| Layer | Location | Responsibility |
|---|---|---|
| **Domain** | `src/domain/` | Business logic and rules. No framework or database imports. |
| **Application** | `src/application/` | Orchestrates domain objects to fulfil use cases. Depends only on domain interfaces. |
| **Infrastructure** | `src/infrastructure/` | Concrete implementations: database, HTTP routes, job queue. |

### Transactional outbox pattern

When a user is registered, two things must happen atomically:

1. The `users` row is inserted into the database.
2. A `user.registered` job is enqueued into pg-boss so that downstream services are notified.

If these happen in two separate transactions, a crash between them leaves the system in an inconsistent state — a user exists with no notification sent, or vice versa. The outbox pattern solves this by routing the pg-boss job INSERT through the **same database transaction** as the user INSERT. Both commit together or both roll back together.

This is implemented via `KyselyUnitOfWork`, which opens a Kysely transaction and provides a transaction-scoped proxy of the event bus. When `publish()` is called inside the unit of work, it passes the active transaction connection to pg-boss, so the job row lands in the same transaction.

### Fan-out pub/sub

pg-boss supports a pub/sub model where multiple subscribers can independently consume the same event. Each subscriber gets its own dedicated queue (named `{subscriberName}.{event}`), so the notification service and the analytic service each receive their own copy of every `user.registered` event without interfering with each other.

---

## Tech Stack

| Category | Technology |
|---|---|
| Runtime | [Bun](https://bun.sh) — runs TypeScript directly, no compilation step |
| Language | TypeScript 5 (strict mode) |
| HTTP framework | [Elysia](https://elysiajs.com) v1.4 |
| Query builder | [Kysely](https://kysely.dev) v0.28 — fully type-safe SQL |
| Database | PostgreSQL 17 |
| PostgreSQL driver | `pg` (node-postgres) |
| Job queue / pub-sub | [pg-boss](https://github.com/timgit/pg-boss) v12 — PostgreSQL-backed |
| Container | Docker Compose (PostgreSQL only) |

---

## Project Structure

```
bkkjs-demo/
├── src/
│   ├── index.ts                        # App entry point — wires everything together
│   │
│   ├── domain/                         # Pure business logic, no infrastructure deps
│   │   ├── domain-event/
│   │   │   ├── events.ts               # DomainEventMap — single source of truth for all events
│   │   │   ├── eventbus.interface.ts   # IEventBus — domain contract for publishing/subscribing
│   │   │   └── dbclient.interface.ts   # IDbClient — minimal interface for transactional publishing
│   │   └── user/
│   │       ├── user.aggregate.ts       # User aggregate root
│   │       ├── email.vo.ts             # Email value object (branded type + validation)
│   │       ├── name.vo.ts              # Name value object (branded type)
│   │       └── user-id.vo.ts           # UserId value object (branded type)
│   │
│   ├── application/                    # Use cases and HTTP route plugins
│   │   ├── use-case.interface.ts       # Generic IUseCase<TInput, TOutput>
│   │   ├── user/
│   │   │   ├── register-user.use-case.ts
│   │   │   └── plugin.ts               # Elysia plugin — mounts /user routes
│   │   ├── notification/
│   │   │   ├── plugin.ts               # Subscribes to user.registered → notification queue
│   │   │   └── event.handler.ts        # Handles event: logs welcome email
│   │   └── analytic/
│   │       ├── plugin.ts               # Subscribes to user.registered → analytic queue
│   │       └── event.handler.ts        # Handles event: logs audit trail
│   │
│   └── infrastructure/                 # Concrete implementations
│       ├── db/
│       │   ├── pool.ts                 # pg connection pool
│       │   ├── kysely.ts               # Kysely singleton
│       │   ├── schema.ts               # setupSchema() — CREATE TABLE IF NOT EXISTS
│       │   └── types.ts                # Kysely Database type map
│       ├── event/
│       │   ├── pgboss.eventbus.ts      # PgBossEventBus — IEventBus implementation
│       │   └── kysely.adapter.ts       # KyselyAdapter — bridges Kysely tx to IDbClient
│       ├── repository/
│       │   └── user.repository.ts      # UserRepository — save and findAll
│       └── unit-of-work/
│           ├── unit-of-work.interface.ts   # IUnitOfWork interface
│           └── kysely.unit-of-work.ts      # KyselyUnitOfWork — wraps a Kysely transaction
│
├── docker-compose.postgres.yaml        # Starts a local PostgreSQL 17 instance
├── package.json
└── tsconfig.json
```

---

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) v1+
- [Docker](https://www.docker.com) (for PostgreSQL)

### 1. Clone the repository

```bash
git clone <repo-url>
cd bkkjs-demo
```

### 2. Install dependencies

```bash
bun install
```

### 3. Start PostgreSQL

```bash
docker compose -f docker-compose.postgres.yaml up -d
```

This starts PostgreSQL 17 on port **15432** with:
- User: `admin`
- Password: `pass`
- Database: `postgres`

### 4. Run the server

```bash
bun run src/index.ts
```

On startup the server will:
1. Create the `users` table if it does not exist.
2. Connect pg-boss to the same PostgreSQL instance.
3. Subscribe the notification and analytic handlers to `user.registered`.
4. Start listening on **http://localhost:3000**.

---

## API Endpoints

### Register a user

```
POST /user/register
Content-Type: application/json

{
  "email": "alice@example.com",
  "name": "Alice"
}
```

**What happens internally:**
1. `RegisterUserUseCase` opens a database transaction via `KyselyUnitOfWork`.
2. Inside the transaction: a `User` aggregate is created, saved to the `users` table, and a `user.registered` event is published — all within the same transaction.
3. pg-boss fans the event out to two queues: `notification.user.registered` and `analytic.user.registered`.
4. Each queue's handler fires independently: one logs a welcome email, the other logs an audit trail entry.

### List all users

```
GET /user/users
```

Returns a JSON array of all registered users.

---

## Architecture Overview

The flow for user registration, from HTTP request to side effects:

```
POST /user/register
        │
        ▼
[ Elysia route (application layer) ]
        │  calls
        ▼
[ RegisterUserUseCase ]
        │  opens transaction via
        ▼
[ KyselyUnitOfWork ]
        │
        ├──► UserRepository.save(user)         → INSERT INTO users  ─┐
        │                                                            │ same DB transaction
        └──► PgBossEventBus.publish(           → INSERT INTO pgboss ─┘
               "user.registered", payload,
               { db: KyselyAdapter(tx) }
             )
                    │
                    │ pg-boss fans out to two queues
                    ▼
        ┌────────────────────────────┐
        │ notification.user.reg...   │──► NotificationHandler (log welcome email)
        └────────────────────────────┘
        ┌────────────────────────────┐
        │ analytic.user.registered   │──► AnalyticHandler (log audit trail)
        └────────────────────────────┘
```

### Domain layer highlights

- **Value objects** use TypeScript's [branded/nominal types](https://www.typescriptlang.org/docs/handbook/2/template-literal-types.html) pattern. This means `Email`, `Name`, and `UserId` are distinct types at compile time — you cannot accidentally pass a raw `string` where a validated `Email` is expected.
- **`DomainEventMap`** (`src/domain/domain-event/events.ts`) is the single source of truth for event names and their payload shapes. Both the publisher and all subscribers import from this file, so TypeScript enforces correctness at compile time.
- **`IEventBus`** and **`IDbClient`** are domain-level interfaces. The domain knows nothing about pg-boss or Kysely by name — it only depends on these minimal contracts.

### Infrastructure layer highlights

- **`KyselyUnitOfWork`** is the orchestrator of the transactional outbox. It wraps a Kysely transaction and injects a transaction-scoped proxy of the event bus into the use case callback. The proxy intercepts `publish()` and adds the `{ db }` option so that pg-boss writes its job row through the open transaction.
- **`KyselyAdapter`** is a small bridge that implements `IDbClient` by delegating `executeSql()` to Kysely's raw query runner, allowing the domain-level `IDbClient` interface to be satisfied without exposing Kysely types to the domain.
- **`UserRepository`** accepts `Kysely<Database> | Transaction<Database>`, so the same class works both inside and outside a unit of work without any special-casing.

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `postgres://admin:pass@localhost:15432/postgres` | PostgreSQL connection string |
| `PGBOSS_MAX_CONNECTIONS` | `10` | Maximum connections in the pg connection pool |
