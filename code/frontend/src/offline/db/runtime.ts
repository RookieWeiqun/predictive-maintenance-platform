import { initializeOfflineOnce, type SQLiteExecutor } from './sqlite';
import { NativeCapacitorExecutor } from './nativeCapacitorExecutor';
import { WebSqlJsExecutor } from './webSqlJsExecutor';

async function createOfflineExecutor(): Promise<SQLiteExecutor> {
  if (NativeCapacitorExecutor.isSupported()) {
    return NativeCapacitorExecutor.create();
  }

  return WebSqlJsExecutor.create();
}

export async function ensureOfflineReady(): Promise<void> {
  await initializeOfflineOnce(createOfflineExecutor);
}
