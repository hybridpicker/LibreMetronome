import {
  DESKTOP_COMMAND_EVENT,
  isDesktopApp,
  reportDesktopState,
  initializeDesktopRuntime,
} from '../../desktop';

describe('desktop bridge', () => {
  afterEach(() => {
    delete window.webkit;
    document.documentElement.classList.remove('desktop-native');
  });

  const installHandler = (postMessage = jest.fn()) => {
    window.webkit = { messageHandlers: { libreMetronome: { postMessage } } };
    return postMessage;
  };

  test('exposes the native command event name', () => {
    expect(DESKTOP_COMMAND_EVENT).toBe('libremetronome-native-command');
  });

  describe('isDesktopApp', () => {
    test('false in a plain browser', () => {
      expect(isDesktopApp()).toBe(false);
    });
    test('false when webkit exists without message handlers', () => {
      window.webkit = {};
      expect(isDesktopApp()).toBe(false);
    });
    test('false when the libreMetronome handler is not registered', () => {
      window.webkit = { messageHandlers: {} };
      expect(isDesktopApp()).toBe(false);
    });
    test('true when the native shell registered its handler', () => {
      installHandler();
      expect(isDesktopApp()).toBe(true);
    });
  });

  describe('reportDesktopState', () => {
    test('posts the state tagged with type "state"', () => {
      const post = installHandler();
      reportDesktopState({ playing: true, tempo: 120 });
      expect(post).toHaveBeenCalledTimes(1);
      expect(post).toHaveBeenCalledWith({ type: 'state', playing: true, tempo: 120 });
    });

    test('characterization: current behaviour, see report - a "type" inside the state overrides the tag', () => {
      const post = installHandler();
      reportDesktopState({ type: 'custom' });
      expect(post).toHaveBeenCalledWith({ type: 'custom' });
    });

    test('is a no-op without a native handler', () => {
      expect(() => reportDesktopState({ playing: true })).not.toThrow();
    });

    test('swallows errors from a tearing-down web view', () => {
      installHandler(
        jest.fn(() => {
          throw new Error('web view gone');
        })
      );
      expect(() => reportDesktopState({ playing: false })).not.toThrow();
    });
  });

  describe('initializeDesktopRuntime', () => {
    test('adds the desktop-native class inside the native shell', () => {
      installHandler();
      initializeDesktopRuntime();
      expect(document.documentElement).toHaveClass('desktop-native');
    });

    test('leaves the document untouched in a browser', () => {
      initializeDesktopRuntime();
      expect(document.documentElement).not.toHaveClass('desktop-native');
    });
  });
});
