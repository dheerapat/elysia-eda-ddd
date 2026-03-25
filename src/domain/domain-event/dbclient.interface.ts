/**
 * IDbClient is the domain layer's structural contract for a database client
 * capable of executing raw SQL. It exists so that IEventBus can accept a
 * db handle for transactional event publishing without naming any
 * infrastructure class.
 *
 * KyselyAdapter satisfies this interface via TypeScript structural typing.
 */
export interface IDbClient {
  executeSql(text: string, values?: any[]): Promise<{ rows: any[] }>;
}
