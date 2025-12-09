import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.miaoda.fleet.v2',
  appName: '妙达车队',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
