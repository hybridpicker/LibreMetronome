describe('IS_NATIVE_APP', () => {
  afterEach(() => {
    jest.dontMock('@capacitor/core');
    jest.resetModules();
  });

  const load = (isNative) => {
    jest.resetModules();
    jest.doMock('@capacitor/core', () => ({
      Capacitor: { isNativePlatform: jest.fn(() => isNative) },
    }));
    return require('../../nativeApp').IS_NATIVE_APP;
  };

  test('is true inside the Capacitor store builds', () => {
    expect(load(true)).toBe(true);
  });

  test('is false in the browser', () => {
    expect(load(false)).toBe(false);
  });
});
