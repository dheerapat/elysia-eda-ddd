import type { IDbClient } from "./dbclient.interface";
import type { DomainEventMap } from "./events";

/**
 * IEventBus is the domain's contract for event publishing and subscription.
 * Domain code (UserService, NotificationService) depends ONLY on this interface.
 * The concrete implementation (PgBossEventBus) lives in infrastructure.
 */
export interface IEventBus {
  /**
   * Publish an event. If opts.db is provided, the publish is routed through
   * that db client's transaction — making it atomic with the surrounding
   * database operation.
   */
  publish<K extends keyof DomainEventMap>(
    event: K,
    payload: DomainEventMap[K],
    opts?: { db?: IDbClient },
  ): Promise<void>;

  /**
   * Subscribe a handler to an event. The handler receives a typed payload.
   * subscriberName is used to derive the subscriber-specific queue name.
   * Convention: `{subscriberName}.{eventName}` — e.g. "notification.user.registered"
   * This naming is encapsulated in the concrete implementation (PgBossEventBus).
   */
  subscribe<K extends keyof DomainEventMap>(
    event: K,
    handler: (payload: DomainEventMap[K]) => Promise<void>,
    subscriberName: string,
  ): Promise<void>;
}
