// MultiCircleMode/index.js creates and unlocks a shared AudioContext when it is first imported.
const loadIndex = ({ init }) => {
  let mod;
  jest.isolateModules(() => {
    jest.doMock('../../../hooks/useMetronomeLogic/audioBuffers', () => ({ initAudioContext: init }));
    jest.doMock('../../../components/Training/withTrainingContainer', () => Component => Component);
    jest.doMock('../../../components/metronome/MultiCircleMode/hooks/useMultiCircleMetronomeLogic', () => jest.fn(() => ({})));
    mod = require('../../../components/metronome/MultiCircleMode'); // eslint-disable-line global-require
  });
  return mod;
};

describe('MultiCircleMode module initialisation', () => {
  beforeEach(() => {
    delete window._multiCircleAudioContext;
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetModules();
    delete window._multiCircleAudioContext;
  });

  test('creates a shared context, tries to resume it and publishes it on window', async () => {
    const ctx = { resume: jest.fn(() => Promise.resolve()) };
    loadIndex({ init: jest.fn(() => ctx) });
    expect(ctx.resume).toHaveBeenCalledTimes(1);
    expect(window._multiCircleAudioContext).toBe(ctx);
    await Promise.resolve();
    await Promise.resolve();
    expect(console.log).toHaveBeenCalledWith('Audio context initialized and resumed for MultiCircleMode');
  });

  test('a refused resume is logged as a warning but the context is still published', async () => {
    const err = new Error('needs gesture');
    const ctx = { resume: jest.fn(() => Promise.reject(err)) };
    loadIndex({ init: jest.fn(() => ctx) });
    await Promise.resolve();
    await Promise.resolve();
    expect(console.warn).toHaveBeenCalledWith('Failed to resume audio context:', err);
    expect(window._multiCircleAudioContext).toBe(ctx);
  });

  test('when no context can be created nothing is published', () => {
    loadIndex({ init: jest.fn(() => null) });
    expect(window._multiCircleAudioContext).toBeUndefined();
  });

  test('when creation throws the error is logged and the import still succeeds', () => {
    const err = new Error('unsupported');
    const mod = loadIndex({ init: jest.fn(() => { throw err; }) });
    expect(console.error).toHaveBeenCalledWith('Error creating shared audio context:', err);
    expect(window._multiCircleAudioContext).toBeUndefined();
    expect(mod.default).toBeDefined();
  });

  test('exports only the Sequence mode component', () => {
    const mod = loadIndex({ init: jest.fn(() => null) });
    expect(Object.keys(mod)).toEqual(['default']);
    expect(typeof mod.default).toBe('function');
  });
});
