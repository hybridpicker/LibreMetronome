import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.hybridpicker.libremetronome',
  appName: 'LibreMetronome',
  webDir: 'build',
  backgroundColor: '#ffffff',
  ios: {
    contentInset: 'always',
    preferredContentMode: 'mobile',
  },
  android: {
    backgroundColor: '#ffffff',
  },
  plugins: {
    StatusBar: {
      overlaysWebView: true,
      style: 'LIGHT',
      backgroundColor: '#ffffff',
    },
  },
};

export default config;
