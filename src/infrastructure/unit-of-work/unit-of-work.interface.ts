import type { IEventBus } from "@domain/domain-event/eventbus.interface";
import type { IUserRepository } from "@infrastructure/repository/user.repository";

/**
 * Repositories bag provided to the UoW callback.
 * Extend this interface as new aggregates are added.
 */
export interface IRepositories {
  userRepository: IUserRepository;
}

/**
 * IUnitOfWork is the domain's contract for transactional work.
 *
 * The callback receives repository implementations and an event bus
 * that are all wired to the same underlying database transaction.
 * The transaction commits if the callback resolves, and rolls back
 * if the callback throws.
 */
export interface IUnitOfWork {
  execute<R>(
    callback: (repos: IRepositories, eventBus: IEventBus) => Promise<R>,
  ): Promise<R>;
}
