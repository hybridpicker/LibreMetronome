/**
 * @jest-environment node
 */
describe('cookieUtils without a window', () => {
  test('loads without touching window and still exports both helpers', () => {
    expect(typeof window).toBe('undefined');

    const mod = require('../../services/cookieUtils');

    expect(typeof mod.getCookie).toBe('function');
    expect(typeof mod.setCookie).toBe('function');
    expect(typeof global.getCookie).toBe('undefined');
  });
});
