import { ensureOfflineReady } from '@/offline';

export async function initializeAndroidRuntime(): Promise<void> {
  await ensureOfflineReady();
}
