/**
 * Bridge between the React application and the native macOS shell
 * (`macos/`). The shell embeds this bundle in a WKWebView, registers the
 * `libreMetronome` message handler and sends commands as
 * `libremetronome-native-command` window events. In a browser or in the
 * Capacitor apps the handler is absent and every function is a no-op.
 */

export const DESKTOP_COMMAND_EVENT = 'libremetronome-native-command';

const getMessageHandler = () =>
  window.webkit?.messageHandlers?.libreMetronome ?? null;

export const isDesktopApp = () => getMessageHandler() !== null;

export const reportDesktopState = (state) => {
  const handler = getMessageHandler();
  if (!handler) return;

  try {
    handler.postMessage({ type: 'state', ...state });
  } catch {
    // The native shell may be tearing the web view down.
  }
};

export const initializeDesktopRuntime = () => {
  if (!isDesktopApp()) return;

  document.documentElement.classList.add('desktop-native');
};
