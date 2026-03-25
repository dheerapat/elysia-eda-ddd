import type { PgBoss } from "pg-boss";
import type { IEventBus } from "@domain/domain-event/eventbus.interface";
import type { DomainEventMap } from "@domain/domain-event/events";
import type { IDbClient } from "@domain/domain-event/dbclient.interface";

/**
 * PgBossEventBus implements IEventBus using pg-boss as the backing store.
 *
 * Queue naming convention: `{subscriberName}.{eventName}` — e.g. "notification.user.registered"
 * This convention is encapsulated here; domain callers pass subscriberName and never see queue names.
 *
 * Partial-transaction semantics of publish():
 * - The subscription lookup (SELECT FROM pgboss.subscription) always runs on the global pg-boss pool.
 * - Job INSERTs for each subscribed queue run through opts.db (the active Kysely transaction) when provided.
 * - Result: if the enclosing transaction rolls back, ALL fan-out job INSERTs are rolled back atomically.
 */
export class PgBossEventBus implements IEventBus {
  constructor(private readonly boss: PgBoss) {}

  async publish<K extends keyof DomainEventMap>(
    event: K,
    payload: DomainEventMap[K],
    opts?: { db?: IDbClient },
  ): Promise<void> {
    // pg-boss v12 pub/sub: publish() fans out to ALL queues subscribed to this event channel
    // The db option is forwarded to each boss.send() call internally — atomicity preserved
    const sendOpts = opts?.db ? { db: opts.db } : {};
    // Subscription lookup on global pool (non-transactional); job INSERTs via opts.db (transactional)
    await this.boss.publish(event as string, payload as object, sendOpts);
  }

  async subscribe<K extends keyof DomainEventMap>(
    event: K,
    handler: (payload: DomainEventMap[K]) => Promise<void>,
    subscriberName: string,
  ): Promise<void> {
    // Queue naming convention lives here — callers never construct queue names
    const queueName = `${subscriberName}.${event}`;
    // Step 1: Create the queue — pg-boss subscription table has FK to queue names
    await this.boss.createQueue(queueName);
    console.log(`[infra] Queue created: ${queueName}`);
    // Step 2: Register channel→queue binding in pgboss.subscription table
    //         This is what boss.publish() queries to discover fan-out targets
    await this.boss.subscribe(event as string, queueName);
    console.log(`[infra] Subscription registered: ${event} → ${queueName}`);
    // Step 3: Start the worker that polls this subscriber queue
    await this.boss.work(queueName, async ([job]) => {
      if (!job) throw new Error(`No job received for queue: ${queueName}`);
      await handler(job.data as DomainEventMap[K]);
    });
    console.log(`[infra] Worker registered: ${queueName}`);
  }
}
