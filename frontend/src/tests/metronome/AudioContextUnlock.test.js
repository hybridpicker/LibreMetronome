describe('iOS audio context unlocking', () => {
  const originalAudioContext = window.AudioContext;

  beforeEach(() => {
    jest.resetModules();
    delete window._audioContext;
    delete window._audioContextInit;
    delete window._multiCircleAudioContext;
  });

  afterEach(() => {
    window.AudioContext = originalAudioContext;
    delete window._audioContext;
    delete window._audioContextInit;
    delete window._multiCircleAudioContext;
  });

  test('every metronome mode reuses the context unlocked by the first gesture', () => {
    const unlockedContext = { state: 'running', sampleRate: 48000 };
    window.AudioContext = jest.fn();
    window._audioContextInit = unlockedContext;

    const { initAudioContext } = require('../../hooks/useMetronomeLogic/audioBuffers');

    expect(initAudioContext()).toBe(unlockedContext);
    expect(window.AudioContext).not.toHaveBeenCalled();
    expect(window._audioContext).toBe(unlockedContext);
  });

  test('resumes WebKit interrupted contexts as well as suspended contexts', async () => {
    const interruptedContext = {
      state: 'interrupted',
      resume: jest.fn(async function resume() {
        this.state = 'running';
      })
    };

    const { resumeAudioContext } = require('../../hooks/useMetronomeLogic/audioBuffers');

    await expect(resumeAudioContext(interruptedContext)).resolves.toBe(true);
    expect(interruptedContext.resume).toHaveBeenCalledTimes(1);
  });

  test('native recovery resumes each shared context only once', async () => {
    const interruptedContext = {
      state: 'interrupted',
      resume: jest.fn(async function resume() {
        this.state = 'running';
      })
    };
    window._audioContext = interruptedContext;
    window._audioContextInit = interruptedContext;
    window._multiCircleAudioContext = interruptedContext;

    const { resumeSharedAudioContexts } = require('../../hooks/useMetronomeLogic/audioBuffers');

    await expect(resumeSharedAudioContexts()).resolves.toBe(true);
    expect(interruptedContext.resume).toHaveBeenCalledTimes(1);
  });
});
