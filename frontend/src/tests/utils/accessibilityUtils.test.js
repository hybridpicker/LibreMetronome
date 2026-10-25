const KEYS = [
  'accessibility-high-contrast',
  'accessibility-large-text',
  'accessibility-reduced-motion',
  'accessibility-audio-feedback',
  'accessibility-screen-reader-messages',
  'accessibility-focus-indicators',
  'accessibility-haptic-feedback',
  'accessibility-color-blind-mode',
];

const BODY_CLASSES = [
  'high-contrast',
  'large-text',
  'reduced-motion',
  'focus-visible-enabled',
  'color-blind',
  'protanopia',
  'deuteranopia',
  'tritanopia',
  'monochromacy',
  'preserve-viewport',
];

const setMatchMedia = (matches) => {
  window.matchMedia = jest.fn((query) => ({ matches: Boolean(matches[query]), media: query }));
};

describe('accessibilityUtils', () => {
  let utils;
  const originalMatchMedia = window.matchMedia;
  const originalAudioContext = window.AudioContext;
  const originalWebkit = window.webkitAudioContext;

  const load = () => {
    jest.resetModules();
    utils = require('../../utils/accessibility/accessibilityUtils');
    return utils;
  };

  beforeEach(() => {
    localStorage.clear();
    document.body.className = '';
    document.body.innerHTML = '';
    document.head.querySelectorAll('link[id^="accessibility-"]').forEach((l) => l.remove());
    delete window.matchMedia;
    delete window.audioFeedbackEnabled;
    delete window.screenReaderMessagesEnabled;
    delete window.hapticFeedbackEnabled;
    delete window.focusIndicatorsEnabled;
    delete window.metronomeDebug;
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    load();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
    window.matchMedia = originalMatchMedia;
    window.AudioContext = originalAudioContext;
    window.webkitAudioContext = originalWebkit;
    delete navigator.vibrate;
    delete window.ontouchstart;
  });

  describe('getBeatAnnouncement', () => {
    test('beat 1 includes the measure length', () => {
      expect(utils.getBeatAnnouncement(1, 4)).toBe('Beat 1 of 4');
    });
    test('other beats announce only the number', () => {
      expect(utils.getBeatAnnouncement(2, 4)).toBe('Beat 2');
      expect(utils.getBeatAnnouncement(4, 4)).toBe('Beat 4');
    });
  });

  describe('detectSystemPreferences', () => {
    test('returns all false when matchMedia is unavailable', () => {
      expect(utils.detectSystemPreferences()).toEqual({
        reducedMotion: false,
        highContrast: false,
        darkMode: false,
      });
    });

    test('returns all false when matchMedia is not a function', () => {
      window.matchMedia = 'nope';
      expect(utils.detectSystemPreferences()).toEqual({
        reducedMotion: false,
        highContrast: false,
        darkMode: false,
      });
    });

    test('reads each media query', () => {
      setMatchMedia({ '(prefers-reduced-motion: reduce)': true });
      expect(utils.detectSystemPreferences()).toEqual({
        reducedMotion: true,
        highContrast: false,
        darkMode: false,
      });

      setMatchMedia({ '(prefers-contrast: more)': true });
      expect(utils.detectSystemPreferences().highContrast).toBe(true);

      setMatchMedia({ '(prefers-color-scheme: dark)': true });
      expect(utils.detectSystemPreferences()).toEqual({
        reducedMotion: false,
        highContrast: false,
        darkMode: true,
      });
    });

    test('legacy -ms-high-contrast also counts as high contrast', () => {
      setMatchMedia({ '(-ms-high-contrast: active)': true });
      expect(utils.detectSystemPreferences().highContrast).toBe(true);
    });

    test('returns safe defaults and logs when matchMedia throws', () => {
      window.matchMedia = jest.fn(() => {
        throw new Error('boom');
      });
      expect(utils.detectSystemPreferences()).toEqual({
        reducedMotion: false,
        highContrast: false,
        darkMode: false,
      });
      expect(console.error).toHaveBeenCalledWith(
        'Error detecting system preferences:',
        expect.any(Error)
      );
    });

    test('characterization: current behaviour, see report - null query results yield null, not false', () => {
      window.matchMedia = jest.fn(() => null);
      expect(utils.detectSystemPreferences()).toEqual({
        reducedMotion: null,
        highContrast: null,
        darkMode: null,
      });
    });
  });

  describe('triggerHapticFeedback', () => {
    let vibrate;
    beforeEach(() => {
      vibrate = jest.fn();
      navigator.vibrate = vibrate;
      window.hapticFeedbackEnabled = true;
    });

    test.each([
      ['short', [20]],
      ['medium', [50]],
      ['long', [100]],
      ['double', [20, 30, 20]],
      ['error', [50, 100, 50, 100, 50]],
    ])('pattern %s vibrates %j', (pattern, expected) => {
      utils.triggerHapticFeedback(pattern);
      expect(vibrate).toHaveBeenCalledWith(expected);
    });

    test('defaults to the short pattern', () => {
      utils.triggerHapticFeedback();
      expect(vibrate).toHaveBeenCalledWith([20]);
    });

    test('unknown pattern names fall back to short', () => {
      utils.triggerHapticFeedback('weird');
      expect(vibrate).toHaveBeenCalledWith([20]);
    });

    test('does nothing when haptic feedback is disabled', () => {
      window.hapticFeedbackEnabled = false;
      utils.triggerHapticFeedback('long');
      expect(vibrate).not.toHaveBeenCalled();
    });

    test('does nothing when navigator.vibrate is missing or not callable', () => {
      delete navigator.vibrate;
      expect(() => utils.triggerHapticFeedback('long')).not.toThrow();
      navigator.vibrate = 'x';
      expect(() => utils.triggerHapticFeedback('long')).not.toThrow();
    });

    test('logs and swallows errors thrown by vibrate', () => {
      const error = new Error('denied');
      vibrate.mockImplementation(() => {
        throw error;
      });
      expect(() => utils.triggerHapticFeedback('short')).not.toThrow();
      expect(console.error).toHaveBeenCalledWith('Failed to trigger haptic feedback:', error);
    });
  });

  describe('announceToScreenReader', () => {
    beforeEach(() => jest.useFakeTimers('modern'));

    test('creates an atomic polite sr-only live region that fills after 100 ms', () => {
      utils.announceToScreenReader('Playing');

      const region = document.body.lastElementChild;
      expect(region.getAttribute('aria-live')).toBe('polite');
      expect(region.getAttribute('aria-atomic')).toBe('true');
      expect(region).toHaveClass('sr-only');
      expect(region).toBeEmptyDOMElement();

      jest.advanceTimersByTime(99);
      expect(region).toBeEmptyDOMElement();
      jest.advanceTimersByTime(1);
      expect(region).toHaveTextContent('Playing');
    });

    test('supports assertive priority', () => {
      utils.announceToScreenReader('Stop!', 'assertive');
      expect(document.body.lastElementChild.getAttribute('aria-live')).toBe('assertive');
    });

    test('removes the region 3 s after the text was set', () => {
      utils.announceToScreenReader('Hello');
      const region = document.body.lastElementChild;

      jest.advanceTimersByTime(100 + 2999);
      expect(document.body).toContainElement(region);
      jest.advanceTimersByTime(1);
      expect(document.body).not.toContainElement(region);
    });

    test('is a no-op when screen reader messages are disabled', () => {
      window.screenReaderMessagesEnabled = false;
      utils.announceToScreenReader('quiet');
      expect(document.body.childElementCount).toBe(0);
    });

    test('announces when the flag is undefined (default enabled)', () => {
      utils.announceToScreenReader('loud');
      expect(document.body.childElementCount).toBe(1);
    });

    test('does not fail when the region was already removed by someone else', () => {
      utils.announceToScreenReader('Hello');
      document.body.lastElementChild.remove();

      expect(() => jest.advanceTimersByTime(4000)).not.toThrow();
      expect(console.error).not.toHaveBeenCalled();
    });

    test('still removes the region if contains() throws', () => {
      utils.announceToScreenReader('Hello');
      const region = document.body.lastElementChild;
      jest.spyOn(document.body, 'contains').mockImplementation(() => {
        throw new Error('no contains');
      });

      jest.advanceTimersByTime(4000);

      expect(Array.from(document.body.children)).not.toContain(region);
    });

    test('logs when neither contains() nor removeChild() work', () => {
      utils.announceToScreenReader('Hello');
      jest.spyOn(document.body, 'contains').mockImplementation(() => {
        throw new Error('no contains');
      });
      jest.spyOn(document.body, 'removeChild').mockImplementation(() => {
        throw new Error('no remove');
      });

      jest.advanceTimersByTime(4000);

      expect(console.log).toHaveBeenCalledWith(
        'Could not remove screen reader element, might be in test env'
      );
    });

    test('skips removal when body.contains is unavailable', () => {
      utils.announceToScreenReader('Hello');
      const region = document.body.lastElementChild;
      document.body.contains = undefined;

      jest.advanceTimersByTime(4000);
      delete document.body.contains;

      expect(Array.from(document.body.children)).toContain(region);
    });

    test('returns quietly when the element cannot be created', () => {
      jest.spyOn(document, 'createElement').mockReturnValue(null);
      expect(() => utils.announceToScreenReader('x')).not.toThrow();
      expect(document.body.childElementCount).toBe(0);
    });

    test('logs when creating the region throws', () => {
      const error = new Error('no dom');
      jest.spyOn(document, 'createElement').mockImplementation(() => {
        throw error;
      });
      utils.announceToScreenReader('x');
      expect(console.error).toHaveBeenCalledWith('Error announcing to screen reader:', error);
    });
  });

  describe('playAudioFeedback', () => {
    let oscillator;
    let gain;
    let ctx;
    let AudioContextMock;

    beforeEach(() => {
      oscillator = { frequency: {}, connect: jest.fn(), start: jest.fn(), stop: jest.fn() };
      gain = { gain: {}, connect: jest.fn() };
      ctx = {
        currentTime: 10,
        destination: { id: 'dest' },
        createOscillator: jest.fn(() => oscillator),
        createGain: jest.fn(() => gain),
      };
      AudioContextMock = jest.fn(() => ctx);
      window.AudioContext = AudioContextMock;
      window.audioFeedbackEnabled = true;
      load();
    });

    test('does nothing (and creates no context) when audio feedback is disabled', () => {
      window.audioFeedbackEnabled = false;
      utils.playAudioFeedback('click');
      expect(AudioContextMock).not.toHaveBeenCalled();
    });

    test('does nothing when no Web Audio API exists', () => {
      window.AudioContext = undefined;
      window.webkitAudioContext = undefined;
      load();
      expect(() => utils.playAudioFeedback('click')).not.toThrow();
    });

    test('uses webkitAudioContext when AudioContext is missing', () => {
      const Webkit = jest.fn(() => ctx);
      window.AudioContext = undefined;
      window.webkitAudioContext = Webkit;
      load();
      utils.playAudioFeedback('click');
      expect(Webkit).toHaveBeenCalledTimes(1);
      expect(oscillator.start).toHaveBeenCalled();
    });

    test('logs when constructing the context throws', () => {
      window.AudioContext = jest.fn(() => {
        throw new Error('blocked');
      });
      load();
      expect(() => utils.playAudioFeedback('click')).not.toThrow();
      expect(console.error).toHaveBeenCalledWith('Web Audio API not supported:', expect.any(Error));
    });

    test('creates the context lazily and reuses it', () => {
      utils.playAudioFeedback('click');
      utils.playAudioFeedback('start');
      expect(AudioContextMock).toHaveBeenCalledTimes(1);
    });

    test.each([
      ['click', 800, 0.1, 10.05],
      ['start', 440, 0.2, 10.15],
      ['stop', 330, 0.2, 10.15],
      ['warning', 220, 0.3, 10.3],
      ['unknown', 600, 0.1, 10.1],
    ])('oscillator fallback for "%s": %i Hz, gain %f, stops at %f', (type, freq, vol, stopAt) => {
      utils.playAudioFeedback(type);

      expect(oscillator.frequency.value).toBe(freq);
      expect(gain.gain.value).toBe(vol);
      expect(oscillator.connect).toHaveBeenCalledWith(gain);
      expect(gain.connect).toHaveBeenCalledWith(ctx.destination);
      expect(oscillator.start).toHaveBeenCalledTimes(1);
      expect(oscillator.stop).toHaveBeenCalledWith(stopAt);
    });

    test('logs when the context has no createOscillator', () => {
      ctx.createOscillator = undefined;
      utils.playAudioFeedback('click');
      expect(console.error).toHaveBeenCalledWith('Audio context does not support createOscillator');
    });

    test('logs when creating the oscillator throws', () => {
      ctx.createOscillator = jest.fn(() => {
        throw new Error('nope');
      });
      expect(() => utils.playAudioFeedback('click')).not.toThrow();
      expect(console.error).toHaveBeenCalledWith('Failed to create oscillator:', expect.any(Error));
    });

    describe('with the metronome sound API', () => {
      let playSound;
      beforeEach(() => {
        playSound = jest.fn();
        window.metronomeDebug = { playSound };
      });

      test.each([
        ['click', 'normal', 0.3],
        ['start', 'first', 0.4],
        ['stop', 'accent', 0.3],
        ['other', 'normal', 0.2],
      ])('%s plays the "%s" sound at volume %f and skips the oscillator', (type, sound, vol) => {
        utils.playAudioFeedback(type);
        expect(playSound).toHaveBeenCalledTimes(1);
        expect(playSound).toHaveBeenCalledWith(sound, vol);
        expect(ctx.createOscillator).not.toHaveBeenCalled();
      });

      test('warning plays the first sound twice, 150 ms apart', () => {
        jest.useFakeTimers('modern');
        utils.playAudioFeedback('warning');

        expect(playSound).toHaveBeenCalledTimes(1);
        jest.advanceTimersByTime(149);
        expect(playSound).toHaveBeenCalledTimes(1);
        jest.advanceTimersByTime(1);
        expect(playSound).toHaveBeenCalledTimes(2);
        expect(playSound).toHaveBeenLastCalledWith('first', 0.3);
      });

      test('falls back to the oscillator when playSound throws', () => {
        playSound.mockImplementation(() => {
          throw new Error('engine down');
        });
        utils.playAudioFeedback('click');
        expect(console.error).toHaveBeenCalledWith(
          'Failed to use metronome sound API:',
          expect.any(Error)
        );
        expect(oscillator.start).toHaveBeenCalledTimes(1);
      });

      test('ignores a non-function playSound and uses the oscillator', () => {
        window.metronomeDebug = { playSound: 'x' };
        utils.playAudioFeedback('click');
        expect(oscillator.start).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('loadAccessibilitySettings', () => {
    test('first run: writes defaults to localStorage and returns them', () => {
      const settings = utils.loadAccessibilitySettings();

      expect(settings).toEqual({
        highContrast: false,
        largeText: false,
        reducedMotion: false,
        audioFeedback: false,
        screenReaderMessages: true,
        focusIndicators: true,
        hapticFeedback: false,
        colorBlindMode: 'none',
      });
      expect(KEYS.map((k) => localStorage.getItem(k))).toEqual([
        'false',
        'false',
        'false',
        'false',
        'true',
        'true',
        'false',
        'none',
      ]);
    });

    test('sets window globals for other modules', () => {
      localStorage.setItem('accessibility-audio-feedback', 'true');
      localStorage.setItem('accessibility-screen-reader-messages', 'false');
      localStorage.setItem('accessibility-focus-indicators', 'false');

      utils.loadAccessibilitySettings();

      expect(window.audioFeedbackEnabled).toBe(true);
      expect(window.screenReaderMessagesEnabled).toBe(false);
      expect(window.focusIndicatorsEnabled).toBe(false);
      expect(window.hapticFeedbackEnabled).toBe(false);
    });

    test('default haptic feedback is on for touch devices that can vibrate', () => {
      window.ontouchstart = null;
      navigator.vibrate = jest.fn();

      const settings = utils.loadAccessibilitySettings();

      expect(settings.hapticFeedback).toBe(true);
      expect(localStorage.getItem('accessibility-haptic-feedback')).toBe('true');
    });

    test('default haptic feedback is off for touch devices that cannot vibrate', () => {
      window.ontouchstart = null;
      expect(utils.loadAccessibilitySettings().hapticFeedback).toBe(false);
    });

    test('default haptic feedback is off for vibrating non-touch devices', () => {
      navigator.vibrate = jest.fn();
      expect(utils.loadAccessibilitySettings().hapticFeedback).toBe(false);
    });

    test('maxTouchPoints counts as touch support', () => {
      Object.defineProperty(navigator, 'maxTouchPoints', { value: 5, configurable: true });
      navigator.vibrate = jest.fn();
      try {
        expect(utils.loadAccessibilitySettings().hapticFeedback).toBe(true);
      } finally {
        delete navigator.maxTouchPoints;
      }
    });

    test('first-run reduced motion follows the system preference', () => {
      setMatchMedia({ '(prefers-reduced-motion: reduce)': true });

      const settings = utils.loadAccessibilitySettings();

      expect(settings.reducedMotion).toBe(true);
      expect(localStorage.getItem('accessibility-reduced-motion')).toBe('true');
      expect(document.body).toHaveClass('reduced-motion');
    });

    test('an explicit "false" overrides the system reduced-motion and contrast preferences', () => {
      setMatchMedia({
        '(prefers-reduced-motion: reduce)': true,
        '(prefers-contrast: more)': true,
      });
      localStorage.setItem('accessibility-reduced-motion', 'false');
      localStorage.setItem('accessibility-high-contrast', 'false');

      const settings = utils.loadAccessibilitySettings();

      expect(settings.reducedMotion).toBe(false);
      expect(settings.highContrast).toBe(false);
    });

    test('system high contrast is applied when the user never overrode it', () => {
      setMatchMedia({ '(prefers-contrast: more)': true });
      localStorage.setItem('accessibility-high-contrast', 'maybe');

      const settings = utils.loadAccessibilitySettings();

      expect(settings.highContrast).toBe(true);
      expect(document.body).toHaveClass('high-contrast');
    });

    test('system reduced motion wins over a stored "true"-less non-false value', () => {
      setMatchMedia({ '(prefers-reduced-motion: reduce)': true });
      localStorage.setItem('accessibility-reduced-motion', 'weird');
      expect(utils.loadAccessibilitySettings().reducedMotion).toBe(true);
    });

    test('resets stale body classes before applying the current settings', () => {
      document.body.classList.add('high-contrast', 'large-text', 'reduced-motion', 'tritanopia');

      utils.loadAccessibilitySettings();

      BODY_CLASSES.filter((c) => c !== 'focus-visible-enabled').forEach((c) => {
        expect(document.body).not.toHaveClass(c);
      });
      expect(document.body).toHaveClass('focus-visible-enabled');
    });

    test('large text adds classes to body and to the text containers', () => {
      document.body.innerHTML =
        '<div class="control-section"></div><div class="tempo-display"></div><div class="unrelated"></div>';
      localStorage.setItem('accessibility-large-text', 'true');

      expect(utils.loadAccessibilitySettings().largeText).toBe(true);

      expect(document.body).toHaveClass('large-text');
      expect(document.querySelector('.control-section')).toHaveClass('large-text');
      expect(document.querySelector('.tempo-display')).toHaveClass('large-text');
      expect(document.querySelector('.unrelated')).not.toHaveClass('large-text');
    });

    test('reduced motion marks animation containers', () => {
      document.body.innerHTML = '<div class="circle-display"></div><div class="analog-display"></div>';
      localStorage.setItem('accessibility-reduced-motion', 'true');

      utils.loadAccessibilitySettings();

      expect(document.querySelector('.circle-display')).toHaveClass('reduced-motion');
      expect(document.querySelector('.analog-display')).toHaveClass('reduced-motion');
    });

    test('focus indicators off removes the body class and skips the stylesheet', () => {
      localStorage.setItem('accessibility-focus-indicators', 'false');

      utils.loadAccessibilitySettings();

      expect(document.body).not.toHaveClass('focus-visible-enabled');
      expect(document.getElementById('accessibility-focus-indicators-stylesheet')).toBeNull();
    });

    describe('high contrast', () => {
      beforeEach(() => {
        localStorage.setItem('accessibility-high-contrast', 'true');
        document.body.innerHTML = `
          <header></header>
          <div class="metronome-container"></div>
          <svg id="s"><path id="p-none" fill="none"/><circle id="c-nofill"/><rect id="r-red" fill="red"/><g id="g"/></svg>
          <canvas id="cv"></canvas>`;
      });

      test('marks body and key containers', () => {
        utils.loadAccessibilitySettings();

        expect(document.body).toHaveClass('high-contrast');
        expect(document.querySelector('header')).toHaveClass('high-contrast');
        expect(document.querySelector('.metronome-container')).toHaveClass('high-contrast');
      });

      test('restyles svg shapes: white stroke, black fill unless unfilled', () => {
        utils.loadAccessibilitySettings();

        const svg = document.getElementById('s');
        expect(svg.style.filter).toBe('brightness(2) contrast(1.5)');
        ['p-none', 'c-nofill', 'r-red'].forEach((id) => {
          const el = document.getElementById(id);
          expect(el.getAttribute('stroke')).toBe('#FFFFFF');
          expect(el.getAttribute('stroke-width')).toBe('2');
        });
        expect(document.getElementById('p-none').getAttribute('fill')).toBe('none');
        expect(document.getElementById('c-nofill').getAttribute('fill')).toBe('none');
        expect(document.getElementById('r-red').getAttribute('fill')).toBe('#000000');
        expect(document.getElementById('g').hasAttribute('stroke')).toBe(false);
      });

      test('inverts canvases', () => {
        utils.loadAccessibilitySettings();
        expect(document.getElementById('cv').style.filter).toBe(
          'brightness(2) contrast(1.5) invert(1)'
        );
      });
    });

    describe('colour-blind mode', () => {
      beforeEach(() => {
        jest.useFakeTimers('modern');
        localStorage.setItem('accessibility-color-blind-mode', 'deuteranopia');
        document.body.innerHTML = `
          <div class="metronome-container" style="width: 50px; height: 60px"></div>
          <div class="beat-grid"></div>
          <svg id="s"></svg><canvas id="cv"></canvas>`;
      });

      test('adds mode classes to body and elements', () => {
        const settings = utils.loadAccessibilitySettings();

        expect(settings.colorBlindMode).toBe('deuteranopia');
        expect(document.body).toHaveClass('color-blind', 'deuteranopia', 'preserve-viewport');
        expect(document.querySelector('.beat-grid')).toHaveClass('color-blind', 'deuteranopia');
      });

      test('forces a repaint after 50 ms and then resets the transforms', () => {
        utils.loadAccessibilitySettings();
        const svg = document.getElementById('s');
        const canvas = document.getElementById('cv');
        const container = document.querySelector('.metronome-container');

        jest.advanceTimersByTime(49);
        expect(svg.style.transform).toBe('');
        jest.advanceTimersByTime(1);
        expect(svg.style.transform).toBe('translateZ(0)');
        expect(canvas.style.transform).toBe('translateZ(0)');
        expect(container.style.transform).toBe('translateZ(0)');
        expect(container.style.width).toBe('');
        expect(container.style.height).toBe('');

        jest.advanceTimersByTime(0);
        jest.runOnlyPendingTimers();
        expect(svg.style.transform).toBe('');
        expect(canvas.style.transform).toBe('');
        expect(container.style.transform).toBe('');
      });

      test('repaint works without a metronome container', () => {
        document.body.innerHTML = '<svg id="s"></svg>';
        utils.loadAccessibilitySettings();
        jest.advanceTimersByTime(50);
        expect(document.getElementById('s').style.transform).toBe('translateZ(0)');
      });

      test('logs when the repaint fails', () => {
        utils.loadAccessibilitySettings();
        const error = new Error('dom gone');
        jest.spyOn(document, 'querySelectorAll').mockImplementation(() => {
          throw error;
        });

        jest.advanceTimersByTime(50);

        expect(console.error).toHaveBeenCalledWith(
          'Error applying color blind mode to elements:',
          error
        );
      });

      test('loads the colour-blind stylesheets exactly once', () => {
        utils.loadAccessibilitySettings();
        utils.loadAccessibilitySettings();

        const cb = document.querySelectorAll('#accessibility-color-blindness-stylesheet');
        const play = document.querySelectorAll('#accessibility-play-button-colorblind-fix-stylesheet');
        expect(cb).toHaveLength(1);
        expect(cb[0].getAttribute('href')).toBe('/styles/color-blindness.css');
        expect(cb[0].rel).toBe('stylesheet');
        expect(play).toHaveLength(1);
      });

      test.each(['protanopia', 'tritanopia', 'monochromacy'])('supports %s', (mode) => {
        localStorage.setItem('accessibility-color-blind-mode', mode);
        utils.loadAccessibilitySettings();
        expect(document.body).toHaveClass('color-blind', mode);
      });

      test('mode "none" applies nothing and loads no colour-blind stylesheet', () => {
        localStorage.setItem('accessibility-color-blind-mode', 'none');
        utils.loadAccessibilitySettings();
        expect(document.body).not.toHaveClass('color-blind');
        expect(document.body).not.toHaveClass('preserve-viewport');
        expect(document.getElementById('accessibility-color-blindness-stylesheet')).toBeNull();
      });
    });

    describe('stylesheet loading', () => {
      test('focus indicator stylesheet is added to <head> once', () => {
        utils.loadAccessibilitySettings();
        utils.loadAccessibilitySettings();

        const links = document.head.querySelectorAll('#accessibility-focus-indicators-stylesheet');
        expect(links).toHaveLength(1);
        expect(links[0].getAttribute('href')).toBe('/styles/focus-indicators.css');
      });

      test('does not append when the link cannot be created', () => {
        jest.spyOn(document, 'createElement').mockReturnValue(null);
        expect(() => utils.loadAccessibilitySettings()).not.toThrow();
        expect(document.getElementById('accessibility-focus-indicators-stylesheet')).toBeNull();
      });

      test('does not append when document.head is missing', () => {
        jest.spyOn(document, 'head', 'get').mockReturnValue(null);
        expect(() => utils.loadAccessibilitySettings()).not.toThrow();
        expect(document.getElementById('accessibility-focus-indicators-stylesheet')).toBeNull();
      });

      test('logs when link creation throws', () => {
        const error = new Error('x');
        jest.spyOn(document, 'createElement').mockImplementation(() => {
          throw error;
        });
        utils.loadAccessibilitySettings();
        expect(console.error).toHaveBeenCalledWith(
          'Error loading stylesheet focus-indicators:',
          error
        );
      });
    });

    test('returns safe defaults and logs when localStorage fails', () => {
      const error = new Error('storage disabled');
      jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw error;
      });

      const settings = utils.loadAccessibilitySettings();

      expect(settings).toEqual({
        highContrast: false,
        largeText: false,
        reducedMotion: false,
        audioFeedback: false,
        screenReaderMessages: true,
        focusIndicators: true,
        hapticFeedback: false,
        colorBlindMode: 'none',
      });
      expect(console.error).toHaveBeenCalledWith('Error loading accessibility settings:', error);
    });
  });
});
