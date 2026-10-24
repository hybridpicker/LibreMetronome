import { Capacitor } from '@capacitor/core';

/**
 * True inside the Google Play / App Store build. That build is paid, ad-free
 * and fully offline: no network requests, no donation links.
 */
export const IS_NATIVE_APP = Capacitor.isNativePlatform();
