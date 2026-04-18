import { CompiledQuery } from "kysely";
import type { Kysely, Transaction } from "kysely";
import type { Database } from "@infrastructure/db/types";
import type { IDbClient } from "@domain/domain-event/dbclient.interface";

/**
 * KyselyAdapter implements IDbClient by delegating executeSql() to Kysely's
 * raw query runner. This allows the domain-level IDbClient interface to be
 * satisfied without exposing Kysely types to the domain.
 *
 * This adapter also satisfies pg-boss's db contract (executeSql method),
 * enabling pg-boss to use an existing Kysely connection instead of managing
 * its own pg.Pool.
 */
export class KyselyAdapter implements IDbClient {
  constructor(
    private readonly runner: Kysely<Database> | Transaction<Database>,
  ) {}

  async executeSql(
    text: string,
    values: unknown[] = [],
  ): Promise<{ rows: unknown[] }> {
    const result = await this.runner.executeQuery(
      CompiledQuery.raw(text, values),
    );
    return { rows: result.rows };
  }
}
