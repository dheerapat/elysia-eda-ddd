import type { Kysely } from "kysely";
import type { Database } from "@infrastructure/db/types";
import type { User } from "@domain/user/user.aggregate";

export interface IUserRepository {
  /**
   * Persist a user. When called through a UnitOfWork, the implementation
   * is already bound to the active transaction — callers do not pass tx.
   */
  save(user: User): Promise<void>;

  /**
   * Return all persisted users.
   */
  findAll(): Promise<Array<{ id: string; email: string; name: string }>>;
}

/**
 * Kysely-backed UserRepository.
 *
 * Accepts any Kysely<Database> instance — the global db handle for
 * standalone use, or a Transaction<Database> (which extends Kysely<Database>)
 * when wired through a UnitOfWork. No subclass needed.
 */
export class UserRepository implements IUserRepository {
  constructor(private readonly db: Kysely<Database>) {}

  async save(user: User): Promise<void> {
    await this.db
      .insertInto("users")
      .values({
        id: user.id as string,
        email: user.email as string,
        name: user.name,
      })
      .execute();
  }

  async findAll(): Promise<Array<{ id: string; email: string; name: string }>> {
    const rows = await this.db
      .selectFrom("users")
      .select(["id", "email", "name"])
      .execute();
    return rows as Array<{ id: string; email: string; name: string }>;
  }
}
