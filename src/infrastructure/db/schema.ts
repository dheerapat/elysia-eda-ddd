import { sql } from "kysely";
import { kysely } from "./kysely.ts";

export async function setupSchema(): Promise<void> {
  await kysely.schema
    .createTable("users")
    .ifNotExists()
    .addColumn("id", "uuid", (cb) =>
      cb.primaryKey().defaultTo(sql`gen_random_uuid()`),
    )
    .addColumn("email", "varchar(255)", (cb) => cb.unique().notNull())
    .addColumn("name", "varchar(255)", (cb) => cb.notNull())
    .addColumn("created_at", "timestamp", (cb) =>
      cb.notNull().defaultTo(sql`now()`),
    )
    .execute();
  console.log("[infra] Users table ready.");
}
