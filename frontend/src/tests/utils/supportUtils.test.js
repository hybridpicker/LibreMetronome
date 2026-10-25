const FALLBACK = 'https://buy.stripe.com/5kAg0J1ARaA6f5u3cc';

describe('getPaymentLink', () => {
  const originalFetch = global.fetch;
  let getPaymentLink;

  const respond = (body, ok = true, status = 200, statusText = 'OK') =>
    jest.fn(() => Promise.resolve({ ok, status, statusText, json: () => Promise.resolve(body) }));

  beforeEach(() => {
    jest.resetModules();
    ({ getPaymentLink } = require('../../utils/supportUtils'));
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  test('requests /api/support-info/ and returns the link from the API', async () => {
    global.fetch = respond({ paymentLink: 'https://pay.example/test' });

    await expect(getPaymentLink()).resolves.toBe('https://pay.example/test');
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith('/api/support-info/');
  });

  test('caches a successful result so the API is only called once', async () => {
    global.fetch = respond({ paymentLink: 'https://pay.example/test' });

    await getPaymentLink();
    const second = await getPaymentLink();

    expect(second).toBe('https://pay.example/test');
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  test('uses the built-in fallback link when the API returns an empty link, and caches it', async () => {
    global.fetch = respond({ paymentLink: '' });

    await expect(getPaymentLink()).resolves.toBe(FALLBACK);
    await expect(getPaymentLink()).resolves.toBe(FALLBACK);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  test('uses the fallback when the field is missing entirely', async () => {
    global.fetch = respond({});
    await expect(getPaymentLink()).resolves.toBe(FALLBACK);
  });

  test('returns an empty string on an HTTP error and does not cache it', async () => {
    global.fetch = respond({}, false, 500, 'Server Error');

    await expect(getPaymentLink()).resolves.toBe('');
    expect(console.error).toHaveBeenCalledWith('Error fetching payment link: 500 Server Error');

    global.fetch = respond({ paymentLink: 'https://pay.example/later' });
    await expect(getPaymentLink()).resolves.toBe('https://pay.example/later');
  });

  test('returns the fallback and caches it when the network request fails', async () => {
    global.fetch = jest.fn(() => Promise.reject(new Error('offline')));

    await expect(getPaymentLink()).resolves.toBe(FALLBACK);
    await expect(getPaymentLink()).resolves.toBe(FALLBACK);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  test('returns the fallback when the body is not valid JSON', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.reject(new SyntaxError('bad json')) })
    );
    await expect(getPaymentLink()).resolves.toBe(FALLBACK);
  });
});
