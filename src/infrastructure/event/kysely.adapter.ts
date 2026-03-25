import { CompiledQuery } from "kysely";
import type { Kysely, Transaction } from "kysely";
import type { Database } from "@infrastructure/db/types";
import type { IDbClient } from "@domain/domain-event/dbclient.interface";

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
