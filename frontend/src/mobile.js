import { App as NativeApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';

const resumeAudio = () => {
  [window._audioContext, window._audioContextInit]
    .filter((context) => context?.state === 'suspended')
    .forEach((context) => {
      context.resume().catch(() => {
        // A later user gesture will retry audio activation.
      });
    });
};

export const initializeMobileRuntime = () => {
  if (!Capacitor.isNativePlatform()) return;

  document.documentElement.classList.add('capacitor-native');
  document.body.classList.add(`platform-${Capacitor.getPlatform()}`);

  StatusBar.setStyle({ style: Style.Light }).catch(() => {});
  StatusBar.setOverlaysWebView({ overlay: true }).catch(() => {});

  NativeApp.addListener('appStateChange', ({ isActive }) => {
    if (isActive) resumeAudio();
  });

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) resumeAudio();
  });
};
