import { runOfflineMigrations } from './migrations';

export interface SQLiteRow {
  [key: string]: string | number | null;
}

export interface SQLiteExecutor {
  execute(statement: string, params?: Array<string | number | null>): Promise<void>;
  query<T>(
    statement: string,
    params?: Array<string | number | null>,
  ): Promise<T[]>;
  getUserVersion(): Promise<number>;
  setUserVersion(version: number): Promise<void>;
}

let offlineExecutor: SQLiteExecutor | null = null;
let initializePromise: Promise<void> | null = null;

export function registerOfflineExecutor(executor: SQLiteExecutor): void {
  offlineExecutor = executor;
}

export function getOfflineExecutor(): SQLiteExecutor {
  if (offlineExecutor == null) {
    throw new Error('Offline SQLite executor is not registered');
  }

  return offlineExecutor;
}

export async function initializeOfflineDatabase(): Promise<void> {
  const executor = getOfflineExecutor();
  const version = await executor.getUserVersion();

  if (version >= 1) {
    return;
  }

  await runOfflineMigrations(executor);
}

export async function initializeOfflineOnce(initializer: () => Promise<SQLiteExecutor>): Promise<void> {
  if (initializePromise != null) {
    return initializePromise;
  }

  initializePromise = (async () => {
    if (offlineExecutor == null) {
      registerOfflineExecutor(await initializer());
    }

    await initializeOfflineDatabase();
  })();

  return initializePromise;
}

export function isOfflineExecutorRegistered(): boolean {
  return offlineExecutor != null;
}

