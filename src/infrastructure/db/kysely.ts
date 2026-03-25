import { Kysely, PostgresDialect } from "kysely";
import { pool } from "./pool.ts";
import type { Database } from "./types.ts";

const dialect = new PostgresDialect({ pool });

export const kysely = new Kysely<Database>({ dialect });
