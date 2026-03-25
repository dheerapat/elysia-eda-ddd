import type { Kysely } from "kysely";
import type { Database } from "@infrastructure/db/types";
import type { IUnitOfWork, IRepositories } from "@infrastructure/unit-of-work/unit-of-work.interface";
import type { IEventBus } from "@domain/domain-event/eventbus.interface";
import type { DomainEventMap } from "@domain/domain-event/events";
import { UserRepository } from "@infrastructure/repository/user.repository";
import { KyselyAdapter } from "@infrastructure/event/kysely.adapter";

/**
 * KyselyUnitOfWork implements IUnitOfWork using Kysely transactions.
 *
 * For each execute() call it:
 *   1. Opens a Kysely transaction
 *   2. Wires transaction-bound repositories and an event bus that
 *      routes all job INSERTs through the same transaction
 *   3. Passes both into the caller's callback
 *   4. Commits on success, rolls back on throw
 */
export class KyselyUnitOfWork implements IUnitOfWork {
  constructor(
    private readonly db: Kysely<Database>,
    private readonly eventBus: IEventBus,
  ) {}

  async execute<R>(
    callback: (repos: IRepositories, eventBus: IEventBus) => Promise<R>,
  ): Promise<R> {
    const baseEventBus = this.eventBus;

    return this.db.transaction().execute(async (tx) => {
      const repos: IRepositories = {
        userRepository: new UserRepository(tx),
      };

      // Wrap the event bus so every publish() automatically carries
      // the active transaction — callers never touch the db handle.
      const txEventBus: IEventBus = {
        publish<K extends keyof DomainEventMap>(
          event: K,
          payload: DomainEventMap[K],
        ) {
          return baseEventBus.publish(event, payload, {
            db: new KyselyAdapter(tx),
          });
        },
        subscribe: baseEventBus.subscribe.bind(baseEventBus),
      };

      return callback(repos, txEventBus);
    });
  }
}
