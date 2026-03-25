import { Pool } from "pg";

export const pool = new Pool({
  connectionString:
    process.env["DATABASE_URL"] ??
    "postgres://admin:pass@localhost:15432/postgres",
  max: parseInt(process.env["PGBOSS_MAX_CONNECTIONS"] ?? "10", 10),
});
