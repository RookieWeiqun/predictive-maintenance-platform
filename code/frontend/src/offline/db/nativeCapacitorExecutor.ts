import { Capacitor } from '@capacitor/core';
import { CapacitorSQLite, SQLiteConnection, type SQLiteDBConnection } from '@capacitor-community/sqlite';
import type { SQLiteExecutor } from './sqlite';

const DATABASE_NAME = 'predictive_maintenance_offline';

export class NativeCapacitorExecutor implements SQLiteExecutor {
  private constructor(private readonly database: SQLiteDBConnection) {}

  static isSupported(): boolean {
    return Capacitor.isNativePlatform();
  }

  static async create(): Promise<NativeCapacitorExecutor> {
    const sqlite = new SQLiteConnection(CapacitorSQLite);
    const database = await sqlite.createConnection(DATABASE_NAME, false, 'no-encryption', 1, false);
    await database.open();
    return new NativeCapacitorExecutor(database);
  }

  async execute(statement: string, params?: Array<string | number | null>): Promise<void> {
    if (params != null && params.length > 0) {
      await this.database.run(statement, params);
      return;
    }

    await this.database.execute(statement);
  }

  async query<T>(
    statement: string,
    params?: Array<string | number | null>,
  ): Promise<T[]> {
    const result = await this.database.query(statement, params ?? []);
    return ((result.values ?? []) as T[]);
  }

  async getUserVersion(): Promise<number> {
    const rows = await this.query<{ user_version: number }>('PRAGMA user_version;');
    return rows[0]?.user_version ?? 0;
  }

  async setUserVersion(version: number): Promise<void> {
    await this.execute(`PRAGMA user_version = ${version};`);
  }
}
