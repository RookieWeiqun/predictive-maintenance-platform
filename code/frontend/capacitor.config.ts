import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.predictivemaintenance.android',
  appName: '预防性维护',
  webDir: 'dist',
  bundledWebRuntime: false,
  android: {
    allowMixedContent: true,
  },
  server: {
    androidScheme: 'https',
  },
};

export default config;
