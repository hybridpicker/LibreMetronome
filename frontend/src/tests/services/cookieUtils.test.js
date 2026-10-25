import { getCookie, setCookie } from '../../services/cookieUtils';

const clearAllCookies = () => {
  document.cookie.split(';').forEach((c) => {
    const name = c.split('=')[0].trim();
    if (name) document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
  });
};

describe('cookieUtils', () => {
  beforeEach(clearAllCookies);
  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  describe('getCookie', () => {
    test('returns null when there are no cookies', () => {
      expect(getCookie('anything')).toBeNull();
    });

    test('returns null when the named cookie is absent', () => {
      document.cookie = 'other=1;path=/';
      expect(getCookie('missing')).toBeNull();
    });

    test('finds a cookie among several, ignoring surrounding whitespace', () => {
      document.cookie = 'a=1;path=/';
      document.cookie = 'csrftoken=abc123;path=/';
      document.cookie = 'z=26;path=/';
      expect(getCookie('csrftoken')).toBe('abc123');
      expect(getCookie('a')).toBe('1');
      expect(getCookie('z')).toBe('26');
    });

    test('decodes URI-encoded values', () => {
      document.cookie = `msg=${encodeURIComponent('a b&c=d/é')};path=/`;
      expect(getCookie('msg')).toBe('a b&c=d/é');
    });

    test('does not confuse a name with another cookie that merely starts with it', () => {
      document.cookie = 'tokenX=wrong;path=/';
      expect(getCookie('token')).toBeNull();
    });

    test('keeps "=" characters inside the value', () => {
      document.cookie = 'k=a=b=c;path=/';
      expect(getCookie('k')).toBe('a=b=c');
    });

    test('returns an empty string for a cookie with an empty value', () => {
      document.cookie = 'empty=;path=/';
      expect(getCookie('empty')).toBe('');
    });
  });

  describe('setCookie', () => {
    test('stores a cookie that getCookie can read back', () => {
      setCookie('activeSoundSetId', '42');
      expect(getCookie('activeSoundSetId')).toBe('42');
    });

    test('writes path=/ and an expiry 365 days ahead by default', () => {
      jest.useFakeTimers('modern');
      jest.setSystemTime(new Date('2026-01-01T00:00:00Z'));
      const writes = [];
      jest.spyOn(document, 'cookie', 'set').mockImplementation((v) => writes.push(v));

      setCookie('n', 'v');

      expect(writes).toEqual([
        `n=v;expires=${new Date('2027-01-01T00:00:00Z').toUTCString()};path=/`,
      ]);
    });

    test('honours a custom lifetime in days', () => {
      jest.useFakeTimers('modern');
      jest.setSystemTime(new Date('2026-01-01T00:00:00Z'));
      const writes = [];
      jest.spyOn(document, 'cookie', 'set').mockImplementation((v) => writes.push(v));

      setCookie('n', 'v', 7);

      expect(writes[0]).toContain(`expires=${new Date('2026-01-08T00:00:00Z').toUTCString()}`);
    });

    test('a negative lifetime expires the cookie immediately', () => {
      setCookie('gone', 'x');
      expect(getCookie('gone')).toBe('x');

      setCookie('gone', 'x', -1);

      expect(getCookie('gone')).toBeNull();
    });

    test('overwrites an existing value', () => {
      setCookie('k', 'one');
      setCookie('k', 'two');
      expect(getCookie('k')).toBe('two');
    });
  });

  test('exposes both helpers on window for debugging', () => {
    expect(window.getCookie).toBe(getCookie);
    expect(window.setCookie).toBe(setCookie);
  });
});
