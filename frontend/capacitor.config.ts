import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.hybridpicker.libremetronome',
  appName: 'LibreMetronome',
  webDir: 'build',
  backgroundColor: '#f7f3eb',
  ios: {
    contentInset: 'always',
    preferredContentMode: 'mobile',
  },
  android: {
    backgroundColor: '#f7f3eb',
  },
  plugins: {
    StatusBar: {
      overlaysWebView: true,
      style: 'LIGHT',
      backgroundColor: '#f7f3eb',
    },
  },
};

export default config;
