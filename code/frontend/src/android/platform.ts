import { Capacitor } from '@capacitor/core';

export function isAndroidRuntime(): boolean {
  return Capacitor.getPlatform() === 'android';
}

export function isNativeMobileRuntime(): boolean {
  return Capacitor.isNativePlatform();
}
