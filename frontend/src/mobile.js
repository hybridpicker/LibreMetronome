import { App as NativeApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { resumeSharedAudioContexts } from './hooks/useMetronomeLogic/audioBuffers';

let wakeLock = null;
let shouldKeepScreenAwake = false;

const resumeAudio = () => {
  resumeSharedAudioContexts().catch(() => {
    // A later user gesture will retry audio activation.
  });
};

/**
 * Prevent automatic display sleep during active metronome playback. iPadOS
 * releases a Web Wake Lock when the app is backgrounded, so it is reacquired
 * whenever the app becomes visible again.
 */
export const setScreenAwake = async (enabled) => {
  shouldKeepScreenAwake = enabled;

  if (!('wakeLock' in navigator)) return;

  try {
    if (enabled && !wakeLock && !document.hidden) {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => {
        wakeLock = null;
      });
    } else if (!enabled && wakeLock) {
      await wakeLock.release();
      wakeLock = null;
    }
  } catch {
    // Wake Lock is an optional enhancement. Audio playback still uses the
    // native iOS playback session when it is not available.
  }
};

export const initializeMobileRuntime = () => {
  if (!Capacitor.isNativePlatform()) return;

  document.documentElement.classList.add('capacitor-native');
  document.body.classList.add(`platform-${Capacitor.getPlatform()}`);

  StatusBar.setStyle({ style: Style.Light }).catch(() => {});
  StatusBar.setOverlaysWebView({ overlay: true }).catch(() => {});

  NativeApp.addListener('appStateChange', ({ isActive }) => {
    if (isActive) {
      resumeAudio();
      setScreenAwake(shouldKeepScreenAwake);
    }
  });

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      resumeAudio();
      setScreenAwake(shouldKeepScreenAwake);
    }
  });
};
