import initSqlJs from 'sql.js/dist/sql-wasm.js';
import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url';
import type { SQLiteExecutor, SQLiteRow } from './sqlite';

type SqlJsDatabase = {
  run(statement: string, params?: Array<string | number | null>): void;
  exec(statement: string): Array<{ columns: string[]; values: Array<Array<string | number | null>> }>;
  prepare(statement: string, params?: Array<string | number | null>): {
    step(): boolean;
    getAsObject(): SQLiteRow;
    free(): void;
  };
  export(): Uint8Array;
};

type SqlJsModule = {
  Database: new (data?: Uint8Array) => SqlJsDatabase;
};

const STORAGE_KEY = 'offline_sqlite_sqljs_db';

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

export class WebSqlJsExecutor implements SQLiteExecutor {
  private constructor(private readonly database: SqlJsDatabase) {}

  static async create(): Promise<WebSqlJsExecutor> {
    const SQL = (await initSqlJs({
      locateFile: () => wasmUrl,
    })) as SqlJsModule;

    const saved = globalThis.localStorage?.getItem(STORAGE_KEY);
    const database = saved ? new SQL.Database(base64ToBytes(saved)) : new SQL.Database();
    return new WebSqlJsExecutor(database);
  }

  private persist(): void {
    globalThis.localStorage?.setItem(STORAGE_KEY, bytesToBase64(this.database.export()));
  }

  async execute(statement: string, params?: Array<string | number | null>): Promise<void> {
    this.database.run(statement, params);
    this.persist();
  }

  async query<T>(
    statement: string,
    params?: Array<string | number | null>,
  ): Promise<T[]> {
    const stmt = this.database.prepare(statement, params);
    try {
      const rows: T[] = [];
      while (stmt.step()) {
        rows.push(stmt.getAsObject() as T);
      }
      return rows;
    } finally {
      stmt.free();
    }
  }

  async getUserVersion(): Promise<number> {
    const result = this.database.exec('PRAGMA user_version;');
    const version = result[0]?.values?.[0]?.[0];
    return typeof version === 'number' ? version : Number(version ?? 0);
  }

  async setUserVersion(version: number): Promise<void> {
    this.database.run(`PRAGMA user_version = ${version};`);
    this.persist();
  }
}
