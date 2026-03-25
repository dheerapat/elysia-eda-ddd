import type { ColumnType, Generated } from "kysely";

export interface User {
  id: Generated<string>;
  email: string;
  name: string;
  created_at: ColumnType<Date, string | undefined, never>;
}

export interface Database {
  users: User;
}
