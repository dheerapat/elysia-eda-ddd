import { PgBoss } from "pg-boss";
import { Elysia } from "elysia";
import { kysely } from "@infrastructure/db/kysely.ts";
import { setupSchema } from "@infrastructure/db/schema.ts";
import { PgBossEventBus } from "@infrastructure/event/pgboss.eventbus.ts";
import { KyselyUnitOfWork } from "@infrastructure/unit-of-work/kysely.unit-of-work.ts";
import { KyselyAdapter } from "@infrastructure/event/kysely.adapter.ts";
import { userPlugin } from "@application/user/plugin.ts";
import { createNotificationPlugin } from "@application/notification/plugin.ts";
import { createAnalyticPlugin } from "@application/analytic/plugin.ts";

// ---------------------------------------------------------------------------
// Bootstrap: schema + pg-boss
// ---------------------------------------------------------------------------
await setupSchema();

const boss = new PgBoss({
  db: new KyselyAdapter(kysely),
});
await boss.start();


const eventBus = new PgBossEventBus(boss);
const unitOfWork = new KyselyUnitOfWork(kysely, eventBus);

// ---------------------------------------------------------------------------
// Elysia app
// ---------------------------------------------------------------------------
const eventHandler = new Elysia()
  .decorate("eventBus", eventBus)
  .use(await createNotificationPlugin(eventBus))
  .use(await createAnalyticPlugin(eventBus));

const app = new Elysia()
  .decorate("kysely", kysely)
  .decorate("unitOfWork", unitOfWork)
  .use(eventHandler)
  .use(userPlugin)
  .get("/health", () => ({ status: "ok" }))
  .listen(3000);

console.log(`[app] Listening on http://localhost:${app.server?.port}`);
