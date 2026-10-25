import { getCookie } from '../../services/cookieUtils';

const clearAllCookies = () => {
  document.cookie.split(';').forEach((c) => {
    const name = c.split('=')[0].trim();
    if (name) document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
  });
};

const okJson = (body) => ({ ok: true, status: 200, statusText: 'OK', json: () => Promise.resolve(body) });

const SERVER_SETS = [
  { id: 7, name: 'Seven', is_active: false },
  { id: 'abc', name: 'Alpha', is_active: true },
  { id: 9, name: 'Nine', is_active: false },
];

// Loads a fresh copy of the service with a given native flag / NODE_ENV.
const loadService = ({ native = false, env, backendUrl } = {}) => {
  jest.resetModules();
  jest.doMock('../../nativeApp', () => ({ IS_NATIVE_APP: native }));
  const savedEnv = process.env.NODE_ENV;
  const savedBackend = process.env.REACT_APP_BACKEND_URL;
  if (env) process.env.NODE_ENV = env;
  if (backendUrl !== undefined) process.env.REACT_APP_BACKEND_URL = backendUrl;
  try {
    return require('../../services/soundSetService');
  } finally {
    process.env.NODE_ENV = savedEnv;
    if (savedBackend === undefined) delete process.env.REACT_APP_BACKEND_URL;
    else process.env.REACT_APP_BACKEND_URL = savedBackend;
  }
};

describe('soundSetService', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    clearAllCookies();
    localStorage.clear();
    global.fetch = jest.fn();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  describe('getActiveSoundSetIdFromCookie', () => {
    test('returns null without a cookie and the string value with one', () => {
      const svc = loadService();
      expect(svc.getActiveSoundSetIdFromCookie()).toBeNull();
      document.cookie = 'activeSoundSetId=12;path=/';
      expect(svc.getActiveSoundSetIdFromCookie()).toBe('12');
    });
  });

  describe('getAllSoundSets', () => {
    test('native app returns the bundled set without any network request', async () => {
      const svc = loadService({ native: true });

      const sets = await svc.getAllSoundSets();

      expect(global.fetch).not.toHaveBeenCalled();
      expect(sets).toEqual([
        expect.objectContaining({
          id: 'bundled-classic',
          is_active: true,
          first_beat_sound_url: '/assets/audio/click_new_first.wav',
          accent_sound_url: '/assets/audio/click_new_accent.wav',
          normal_beat_sound_url: '/assets/audio/click_new.wav',
        }),
      ]);
    });

    test('fetches from the local backend in development with credentials and JSON headers', async () => {
      global.fetch.mockResolvedValue(okJson(SERVER_SETS));
      const svc = loadService();

      await svc.getAllSoundSets();

      const [url, options] = global.fetch.mock.calls[0];
      expect(url).toBe('http://localhost:8000/api/sound-sets/');
      expect(options.credentials).toBe('include');
      expect(options.headers).toEqual({
        Accept: 'application/json',
        'Content-Type': 'application/json',
      });
      expect(options.signal).toBeDefined();
    });

    test('uses REACT_APP_BACKEND_URL in production', async () => {
      global.fetch.mockResolvedValue(okJson([]));
      const svc = loadService({ env: 'production', backendUrl: 'https://api.example.org' });

      await svc.getAllSoundSets();

      expect(global.fetch.mock.calls[0][0]).toBe('https://api.example.org/api/sound-sets/');
    });

    test('falls back to window.location.origin in production without a backend URL', async () => {
      global.fetch.mockResolvedValue(okJson([]));
      const svc = loadService({ env: 'production', backendUrl: '' });

      await svc.getAllSoundSets();

      expect(global.fetch.mock.calls[0][0]).toBe(`${window.location.origin}/api/sound-sets/`);
    });

    test('marks exactly the set matching the cookie as active (id types are normalised)', async () => {
      global.fetch.mockResolvedValue(okJson(SERVER_SETS));
      document.cookie = 'activeSoundSetId=9;path=/';
      const svc = loadService();

      const sets = await svc.getAllSoundSets();

      expect(sets.map((s) => [s.id, s.is_active])).toEqual([
        [7, false],
        ['abc', false],
        [9, true],
      ]);
    });

    test('ignores the backend is_active flag when the cookie names an unknown set', async () => {
      global.fetch.mockResolvedValue(okJson(SERVER_SETS));
      document.cookie = 'activeSoundSetId=nope;path=/';
      const svc = loadService();

      const sets = await svc.getAllSoundSets();

      expect(sets.every((s) => s.is_active === false)).toBe(true);
    });

    test('without a cookie activates the first set and persists the choice', async () => {
      global.fetch.mockResolvedValue(okJson(SERVER_SETS));
      const svc = loadService();

      const sets = await svc.getAllSoundSets();

      expect(sets.map((s) => s.is_active)).toEqual([true, false, false]);
      expect(getCookie('activeSoundSetId')).toBe('7');
      expect(localStorage.getItem('activeSoundSetId')).toBe('7');
    });

    test('an empty server list without a cookie is returned untouched and stores nothing', async () => {
      global.fetch.mockResolvedValue(okJson([]));
      const svc = loadService();

      await expect(svc.getAllSoundSets()).resolves.toEqual([]);
      expect(getCookie('activeSoundSetId')).toBeNull();
      expect(localStorage.getItem('activeSoundSetId')).toBeNull();
    });

    test('an HTTP error falls back to the default sets and selects the first', async () => {
      global.fetch.mockResolvedValue({ ok: false, status: 503, statusText: 'Unavailable' });
      const svc = loadService();

      const sets = await svc.getAllSoundSets();

      expect(sets.map((s) => [s.id, s.is_active])).toEqual([
        ['default-woodblock', true],
        ['default-drums', false],
      ]);
      expect(getCookie('activeSoundSetId')).toBe('default-woodblock');
      expect(localStorage.getItem('activeSoundSetId')).toBe('default-woodblock');
      expect(console.error).toHaveBeenCalledWith(
        'Error fetching all sound sets from',
        'http://localhost:8000/api/sound-sets/',
        ':',
        expect.objectContaining({ message: 'HTTP error: 503 Unavailable' })
      );
    });

    test('a network error keeps an existing cookie choice among the defaults', async () => {
      global.fetch.mockRejectedValue(new TypeError('Failed to fetch'));
      document.cookie = 'activeSoundSetId=default-drums;path=/';
      const svc = loadService();

      const sets = await svc.getAllSoundSets();

      expect(sets.map((s) => [s.id, s.is_active])).toEqual([
        ['default-woodblock', false],
        ['default-drums', true],
      ]);
      expect(getCookie('activeSoundSetId')).toBe('default-drums');
      expect(localStorage.getItem('activeSoundSetId')).toBeNull();
    });

    test('a cookie naming no default set leaves every default inactive', async () => {
      global.fetch.mockRejectedValue(new Error('offline'));
      document.cookie = 'activeSoundSetId=server-set-5;path=/';
      const svc = loadService();

      const sets = await svc.getAllSoundSets();

      expect(sets.map((s) => s.is_active)).toEqual([false, false]);
    });

    test('default sets carry usable sound URLs', async () => {
      global.fetch.mockRejectedValue(new Error('offline'));
      const svc = loadService();

      const sets = await svc.getAllSoundSets();

      sets.forEach((s) => {
        expect(s.first_beat_sound_url).toMatch(/^\/metronome_sounds\/.+\.mp3$/);
        expect(s.accent_sound_url).toMatch(/^\/metronome_sounds\/.+\.mp3$/);
        expect(s.normal_beat_sound_url).toMatch(/^\/metronome_sounds\/.+\.mp3$/);
      });
    });

    test('uses AbortSignal.timeout(5000) when available', async () => {
      const fakeSignal = { fake: true };
      const original = AbortSignal.timeout;
      AbortSignal.timeout = jest.fn(() => fakeSignal);
      global.fetch.mockResolvedValue(okJson([]));
      const svc = loadService();

      try {
        await svc.getAllSoundSets();
        expect(AbortSignal.timeout).toHaveBeenCalledWith(5000);
        expect(global.fetch.mock.calls[0][1].signal).toBe(fakeSignal);
      } finally {
        if (original) AbortSignal.timeout = original;
        else delete AbortSignal.timeout;
      }
    });

    test('without AbortSignal.timeout it aborts the request after 5 s via an AbortController', async () => {
      jest.useFakeTimers('modern');
      const original = AbortSignal.timeout;
      delete AbortSignal.timeout;
      global.fetch.mockResolvedValue(okJson([]));
      const svc = loadService();

      try {
        await svc.getAllSoundSets();
        const { signal } = global.fetch.mock.calls[0][1];
        expect(signal.aborted).toBe(false);
        jest.advanceTimersByTime(4999);
        expect(signal.aborted).toBe(false);
        jest.advanceTimersByTime(1);
        expect(signal.aborted).toBe(true);
      } finally {
        if (original) AbortSignal.timeout = original;
      }
    });
  });

  describe('setActiveSoundSet', () => {
    test('short-circuits when the id is already stored in the cookie', async () => {
      document.cookie = 'activeSoundSetId=5;path=/';
      const svc = loadService();
      const listener = jest.fn();
      window.addEventListener('soundSetChanged', listener);

      const result = await svc.setActiveSoundSet(5);

      window.removeEventListener('soundSetChanged', listener);
      expect(result).toEqual({ id: '5', is_active: true, status: 'Already active' });
      expect(global.fetch).not.toHaveBeenCalled();
      expect(listener).not.toHaveBeenCalled();
      expect(localStorage.getItem('activeSoundSetId')).toBeNull();
    });

    test('stores the choice locally, broadcasts the event and posts to the backend', async () => {
      document.cookie = 'csrftoken=tok123;path=/';
      global.fetch.mockResolvedValue(okJson({}));
      const svc = loadService();
      const events = [];
      const listener = (e) => events.push(e.detail);
      window.addEventListener('soundSetChanged', listener);

      const result = await svc.setActiveSoundSet(8);

      window.removeEventListener('soundSetChanged', listener);
      expect(result).toEqual({ id: '8', is_active: true, status: 'Preference saved' });
      expect(getCookie('activeSoundSetId')).toBe('8');
      expect(localStorage.getItem('activeSoundSetId')).toBe('8');
      expect(events).toEqual([{ soundSetId: '8' }]);
      expect(global.fetch).toHaveBeenCalledWith('http://localhost:8000/api/sound-sets/8/set-active/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': 'tok123',
          Accept: 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ sound_set_id: '8' }),
      });
    });

    test('keeps the local preference and reports it when the backend answers with an error', async () => {
      global.fetch.mockResolvedValue({ ok: false, status: 403, statusText: 'Forbidden' });
      const svc = loadService();

      const result = await svc.setActiveSoundSet('x1');

      expect(result).toEqual({ id: 'x1', is_active: true, status: 'Local preference saved' });
      expect(getCookie('activeSoundSetId')).toBe('x1');
    });

    test('keeps the local preference when the network fails', async () => {
      global.fetch.mockRejectedValue(new Error('offline'));
      const svc = loadService();

      const result = await svc.setActiveSoundSet('x2');

      expect(result.status).toBe('Local preference saved');
      expect(localStorage.getItem('activeSoundSetId')).toBe('x2');
    });

    test('native app saves locally and never contacts a server', async () => {
      const svc = loadService({ native: true });
      const listener = jest.fn();
      window.addEventListener('soundSetChanged', listener);

      const result = await svc.setActiveSoundSet('bundled-classic');

      window.removeEventListener('soundSetChanged', listener);
      expect(result).toEqual({ id: 'bundled-classic', is_active: true, status: 'Local preference saved' });
      expect(global.fetch).not.toHaveBeenCalled();
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe('getActiveSoundSet', () => {
    test('returns the set named by the cookie', async () => {
      global.fetch.mockResolvedValue(okJson(SERVER_SETS));
      document.cookie = 'activeSoundSetId=9;path=/';
      const svc = loadService();

      await expect(svc.getActiveSoundSet()).resolves.toMatchObject({ id: 9, name: 'Nine' });
    });

    test('uses localStorage when the cookie names an unknown set and re-syncs the cookie', async () => {
      global.fetch.mockResolvedValue(okJson(SERVER_SETS));
      document.cookie = 'activeSoundSetId=gone;path=/';
      localStorage.setItem('activeSoundSetId', 'abc');
      const svc = loadService();

      const active = await svc.getActiveSoundSet();

      expect(active.name).toBe('Alpha');
      expect(getCookie('activeSoundSetId')).toBe('abc');
    });

    test('falls back to the first set and stores it when neither cookie nor storage match', async () => {
      global.fetch.mockResolvedValue(okJson(SERVER_SETS));
      document.cookie = 'activeSoundSetId=gone;path=/';
      localStorage.setItem('activeSoundSetId', 'also-gone');
      const svc = loadService();

      const active = await svc.getActiveSoundSet();

      expect(active.id).toBe(7);
      expect(localStorage.getItem('activeSoundSetId')).toBe('7');
      expect(getCookie('activeSoundSetId')).toBe('7');
    });

    test('with no stored preference the first available set wins', async () => {
      global.fetch.mockResolvedValue(okJson(SERVER_SETS));
      const svc = loadService();

      await expect(svc.getActiveSoundSet()).resolves.toMatchObject({ id: 7 });
    });

    test('with the backend down it returns the first default set', async () => {
      global.fetch.mockRejectedValue(new Error('offline'));
      const svc = loadService();

      await expect(svc.getActiveSoundSet()).resolves.toMatchObject({
        id: 'default-woodblock',
        name: 'Wood Block',
      });
    });

    test('an empty server list triggers the last-resort default and logs a critical error', async () => {
      global.fetch.mockResolvedValue(okJson([]));
      const svc = loadService();

      const active = await svc.getActiveSoundSet();

      expect(active.id).toBe('default-woodblock');
      expect(getCookie('activeSoundSetId')).toBe('default-woodblock');
      expect(localStorage.getItem('activeSoundSetId')).toBe('default-woodblock');
      expect(console.error).toHaveBeenCalledWith(
        'Critical error fetching active sound set:',
        expect.objectContaining({ message: 'No sound sets available' })
      );
    });

    test('native app resolves to the bundled set', async () => {
      const svc = loadService({ native: true });

      await expect(svc.getActiveSoundSet()).resolves.toMatchObject({ id: 'bundled-classic' });
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });
});
