describe('mobile runtime', () => {
  let mobile;
  let capacitor;
  let statusBar;
  let nativeApp;
  let resumeShared;
  let docListeners;
  let wakeLockSentinel;
  let lockRelease;
  const originalAdd = document.addEventListener;

  const load = ({ native = true, platform = 'ios' } = {}) => {
    jest.resetModules();
    capacitor = {
      isNativePlatform: jest.fn(() => native),
      getPlatform: jest.fn(() => platform),
    };
    statusBar = {
      setStyle: jest.fn(() => Promise.resolve()),
      setOverlaysWebView: jest.fn(() => Promise.resolve()),
    };
    nativeApp = { addListener: jest.fn() };
    resumeShared = jest.fn(() => Promise.resolve());
    jest.doMock('@capacitor/core', () => ({ Capacitor: capacitor }));
    jest.doMock('@capacitor/status-bar', () => ({
      StatusBar: statusBar,
      Style: { Light: 'LIGHT' },
    }));
    jest.doMock('@capacitor/app', () => ({ App: nativeApp }));
    jest.doMock('../../hooks/useMetronomeLogic/audioBuffers', () => ({
      resumeSharedAudioContexts: resumeShared,
    }));
    mobile = require('../../mobile');
  };

  const installWakeLock = () => {
    lockRelease = jest.fn(() => Promise.resolve());
    const releaseListeners = {};
    wakeLockSentinel = {
      release: lockRelease,
      addEventListener: jest.fn((type, cb) => {
        releaseListeners[type] = cb;
      }),
      fireRelease: () => releaseListeners.release(),
    };
    Object.defineProperty(navigator, 'wakeLock', {
      configurable: true,
      value: { request: jest.fn(() => Promise.resolve(wakeLockSentinel)) },
    });
  };

  const setHidden = (value) => {
    jest.spyOn(document, 'hidden', 'get').mockReturnValue(value);
  };

  beforeEach(() => {
    docListeners = [];
    jest.spyOn(document, 'addEventListener').mockImplementation((type, cb, opts) => {
      docListeners.push([type, cb]);
      return originalAdd.call(document, type, cb, opts);
    });
  });

  afterEach(() => {
    docListeners.forEach(([type, cb]) => document.removeEventListener(type, cb));
    jest.restoreAllMocks();
    delete navigator.wakeLock;
    document.documentElement.className = '';
    document.body.className = '';
    jest.dontMock('@capacitor/core');
    jest.dontMock('@capacitor/status-bar');
    jest.dontMock('@capacitor/app');
    jest.dontMock('../../hooks/useMetronomeLogic/audioBuffers');
  });

  describe('setScreenAwake', () => {
    test('does nothing when the Wake Lock API is unavailable', async () => {
      load();
      await expect(mobile.setScreenAwake(true)).resolves.toBeUndefined();
    });

    test('requests a screen wake lock once and keeps it', async () => {
      load();
      installWakeLock();

      await mobile.setScreenAwake(true);
      await mobile.setScreenAwake(true);

      expect(navigator.wakeLock.request).toHaveBeenCalledTimes(1);
      expect(navigator.wakeLock.request).toHaveBeenCalledWith('screen');
    });

    test('releases the lock when disabled', async () => {
      load();
      installWakeLock();
      await mobile.setScreenAwake(true);

      await mobile.setScreenAwake(false);

      expect(lockRelease).toHaveBeenCalledTimes(1);
      await mobile.setScreenAwake(true);
      expect(navigator.wakeLock.request).toHaveBeenCalledTimes(2);
    });

    test('disabling without a held lock does not call release', async () => {
      load();
      installWakeLock();
      await mobile.setScreenAwake(false);
      expect(lockRelease).not.toHaveBeenCalled();
      expect(navigator.wakeLock.request).not.toHaveBeenCalled();
    });

    test('does not request a lock while the document is hidden', async () => {
      load();
      installWakeLock();
      setHidden(true);
      await mobile.setScreenAwake(true);
      expect(navigator.wakeLock.request).not.toHaveBeenCalled();
    });

    test('re-acquires after the system released the lock', async () => {
      load();
      installWakeLock();
      await mobile.setScreenAwake(true);

      wakeLockSentinel.fireRelease();
      await mobile.setScreenAwake(true);

      expect(navigator.wakeLock.request).toHaveBeenCalledTimes(2);
    });

    test('swallows a rejected request', async () => {
      load();
      installWakeLock();
      navigator.wakeLock.request.mockRejectedValue(new Error('NotAllowedError'));
      await expect(mobile.setScreenAwake(true)).resolves.toBeUndefined();
    });

    test('swallows a failing release', async () => {
      load();
      installWakeLock();
      await mobile.setScreenAwake(true);
      lockRelease.mockRejectedValue(new Error('already released'));
      await expect(mobile.setScreenAwake(false)).resolves.toBeUndefined();
    });
  });

  describe('initializeMobileRuntime', () => {
    test('is a no-op in the browser', () => {
      load({ native: false });

      mobile.initializeMobileRuntime();

      expect(document.documentElement.className).toBe('');
      expect(document.body.className).toBe('');
      expect(statusBar.setStyle).not.toHaveBeenCalled();
      expect(nativeApp.addListener).not.toHaveBeenCalled();
      expect(docListeners.filter(([t]) => t === 'visibilitychange')).toHaveLength(0);
    });

    test.each(['ios', 'android'])('marks the document for the %s app', (platform) => {
      load({ platform });

      mobile.initializeMobileRuntime();

      expect(document.documentElement).toHaveClass('capacitor-native');
      expect(document.body).toHaveClass(`platform-${platform}`);
    });

    test('configures the status bar', () => {
      load();
      mobile.initializeMobileRuntime();
      expect(statusBar.setStyle).toHaveBeenCalledWith({ style: 'LIGHT' });
      expect(statusBar.setOverlaysWebView).toHaveBeenCalledWith({ overlay: true });
    });

    test('ignores status bar failures', async () => {
      load();
      statusBar.setStyle.mockRejectedValue(new Error('unsupported'));
      statusBar.setOverlaysWebView.mockRejectedValue(new Error('unsupported'));
      expect(() => mobile.initializeMobileRuntime()).not.toThrow();
      await Promise.resolve();
    });

    describe('app state changes', () => {
      const appStateListener = () => {
        const [type, cb] = nativeApp.addListener.mock.calls[0];
        expect(type).toBe('appStateChange');
        return cb;
      };

      test('returning to the foreground resumes audio and restores the wake lock', async () => {
        load();
        installWakeLock();
        await mobile.setScreenAwake(true);
        wakeLockSentinel.fireRelease(); // iPadOS dropped the lock in the background
        mobile.initializeMobileRuntime();

        appStateListener()({ isActive: true });
        await Promise.resolve();

        expect(resumeShared).toHaveBeenCalledTimes(1);
        expect(navigator.wakeLock.request).toHaveBeenCalledTimes(2);
      });

      test('going to the background does nothing', () => {
        load();
        installWakeLock();
        mobile.initializeMobileRuntime();

        appStateListener()({ isActive: false });

        expect(resumeShared).not.toHaveBeenCalled();
        expect(navigator.wakeLock.request).not.toHaveBeenCalled();
      });

      test('without a requested wake lock, foregrounding only resumes audio', () => {
        load();
        installWakeLock();
        mobile.initializeMobileRuntime();

        appStateListener()({ isActive: true });

        expect(resumeShared).toHaveBeenCalledTimes(1);
        expect(navigator.wakeLock.request).not.toHaveBeenCalled();
      });

      test('a failing audio resume is swallowed', async () => {
        load();
        resumeShared.mockRejectedValue(new Error('suspended'));
        mobile.initializeMobileRuntime();

        expect(() => appStateListener()({ isActive: true })).not.toThrow();
        await Promise.resolve();
      });
    });

    describe('visibility changes', () => {
      const fireVisibility = () => document.dispatchEvent(new Event('visibilitychange'));

      test('becoming visible resumes audio and re-acquires the wake lock', async () => {
        load();
        installWakeLock();
        await mobile.setScreenAwake(true);
        wakeLockSentinel.fireRelease();
        mobile.initializeMobileRuntime();
        setHidden(false);

        fireVisibility();
        await Promise.resolve();

        expect(resumeShared).toHaveBeenCalledTimes(1);
        expect(navigator.wakeLock.request).toHaveBeenCalledTimes(2);
      });

      test('becoming hidden does nothing', () => {
        load();
        installWakeLock();
        mobile.initializeMobileRuntime();
        setHidden(true);

        fireVisibility();

        expect(resumeShared).not.toHaveBeenCalled();
      });
    });
  });
});
