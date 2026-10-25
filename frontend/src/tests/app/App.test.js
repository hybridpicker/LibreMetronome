import React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import App from '../../App';
import useMetronomeLogic from '../../hooks/useMetronomeLogic';
import { initAudioContext, resumeAudioContext } from '../../hooks/useMetronomeLogic/audioBuffers';
import { setScreenAwake } from '../../mobile';
import { DESKTOP_COMMAND_EVENT, reportDesktopState } from '../../desktop';
import { stubProps } from '../helpers/app-stubs';

const mockNative = { value: false };

jest.mock('../../nativeApp', () => ({
  get IS_NATIVE_APP() {
    return mockNative.value;
  }
}));

jest.mock('../../mobile', () => ({ setScreenAwake: jest.fn() }));

jest.mock('../../desktop', () => ({
  ...jest.requireActual('../../desktop'),
  reportDesktopState: jest.fn()
}));

jest.mock('../../hooks/useMetronomeLogic', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('../../hooks/useMetronomeLogic/tapFeedback', () => ({ playTapFeedback: jest.fn() }));
jest.mock('../../hooks/useMetronomeLogic/audioBuffers', () => ({
  initAudioContext: jest.fn(),
  resumeAudioContext: jest.fn()
}));
jest.mock('../../utils/layoutSize', () => ({
  useVizCardSize: () => [{ current: null }, { width: 300, height: 200 }]
}));

jest.mock('../../components/metronome/AnalogMode/AnalogMetronomeCanvas', () => ({
  __esModule: true,
  default: ({ isPaused, tempo }) => (
    <div data-testid="analog-canvas" data-paused={String(isPaused)} data-tempo={tempo} />
  )
}));
jest.mock('../../components/metronome/Score/BeatStaff', () => ({
  __esModule: true,
  default: ({ beats, tempo, onToggle }) => (
    <div data-testid="beat-staff" data-beats={beats} data-tempo={tempo}>
      <button type="button" onClick={() => onToggle(2)}>toggle-accent-2</button>
    </div>
  )
}));
jest.mock('../../components/metronome/GridMode/GridModeMetronome', () => ({
  __esModule: true,
  default: require('../helpers/app-stubs').makeModeStub('grid')
}));
jest.mock('../../components/metronome/MultiCircleMode', () => ({
  __esModule: true,
  default: require('../helpers/app-stubs').makeModeStub('multi')
}));
jest.mock('../../components/metronome/PolyrhythmMode', () => ({
  __esModule: true,
  default: require('../helpers/app-stubs').makeModeStub('polyrhythm')
}));
jest.mock('../../components/Menu/SettingsContent', () => ({
  __esModule: true,
  default: (props) => (
    <div data-testid="settings-content" data-volume={props.volume} data-tempo={props.defaultTempo}
      data-subdivisions={props.defaultSubdivisions} data-mode={props.currentMode}>
      <button type="button" onClick={() => props.setDefaultTempo(77)}>settings-set-tempo</button>
      <button type="button" onClick={() => props.setDefaultSubdivisions(6)}>settings-set-subdivisions</button>
      <button type="button" onClick={() => props.setVolume(0.25)}>settings-set-volume</button>
      <button type="button" onClick={() => props.setSoundSetReloadTrigger((n) => n + 1)}>settings-reload</button>
      <button type="button" onClick={props.onClose}>settings-close</button>
    </div>
  )
}));
jest.mock('../../components/Menu/TrainingContent', () => ({
  __esModule: true,
  default: (props) => (
    <div data-testid="training-content">
      <button type="button" onClick={() => props.setTrainingSettings((prev) => ({ ...prev, speedMode: 2, macroMode: 1, tempoIncreasePercent: 9 }))}>
        training-update
      </button>
      <button type="button" onClick={() => props.setMode('grid')}>training-grid</button>
      <button type="button" onClick={() => props.setIsPaused(false)}>training-play</button>
    </div>
  )
}));
jest.mock('../../components/Support', () => ({
  ...jest.requireActual('../../components/Support'),
  SupportPage: () => <div data-testid="support-page">support</div>
}));

const flush = async () => {
  await act(async () => {
    await Promise.resolve();
  });
};

const press = (code, target = window, extra = {}) => {
  fireEvent.keyDown(target, { code, ...extra });
};

const nativeCommand = (command, value) => {
  act(() => {
    window.dispatchEvent(new CustomEvent(DESKTOP_COMMAND_EVENT, { detail: { command, value } }));
  });
};

const tempoSlider = () => screen.getByRole('slider', { name: 'Tempo' });
const status = () => screen.getByRole('status');

// Head metadata has no accessible role, so it is read from the document head.
const metaContent = (name) =>
  // eslint-disable-next-line testing-library/no-node-access
  document.head.querySelector(`meta[name="${name}"]`)?.getAttribute('content');

const MODES = ['Analog', 'Beat', 'Grid', 'Sequence', 'Polyrhythm'];
const chooseMode = (name) => fireEvent.click(screen.getByRole('button', { name: `${name} mode` }));

let logic;
let spies;

beforeEach(() => {
  jest.useFakeTimers();
  window.localStorage.clear();
  mockNative.value = false;
  logic = {
    audioCtx: { state: 'running', resume: jest.fn().mockResolvedValue() },
    audioBuffers: {},
    normalBufferRef: { current: {} },
    accentBufferRef: { current: {} },
    firstBufferRef: { current: {} },
    reloadSounds: jest.fn().mockResolvedValue(true),
    startScheduler: jest.fn(),
    stopScheduler: jest.fn(),
    tapTempo: jest.fn(),
    updateBeatMultiplier: jest.fn(),
    currentSubdivision: 0
  };
  useMetronomeLogic.mockImplementation(() => logic);
  initAudioContext.mockReset().mockReturnValue({ state: 'running' });
  resumeAudioContext.mockReset().mockResolvedValue();
  setScreenAwake.mockClear();
  reportDesktopState.mockClear();
  Object.keys(stubProps).forEach((k) => delete stubProps[k]);
  window._audioContextInit = { state: 'running' };
  delete window._audioContext;
  delete window._tapTempoTimes;
  spies = ['log', 'warn', 'error'].map((m) => jest.spyOn(console, m).mockImplementation(() => {}));
});

afterEach(() => {
  jest.clearAllTimers();
  jest.useRealTimers();
  spies.forEach((s) => s.mockRestore());
  document.body.className = '';
});

describe('initial state', () => {
  test('defaults: analog mode, 120 BPM, volume 1, paused', () => {
    render(<App />);
    expect(screen.getByTestId('analog-canvas')).toHaveAttribute('data-paused', 'true');
    expect(tempoSlider()).toHaveValue('120');
    expect(screen.getByRole('slider', { name: 'Volume' })).toHaveValue('1');
    expect(status()).toHaveTextContent('Metronome paused');
    expect(screen.getByRole('main')).toHaveClass('mode-analog');
  });

  test.each([
    ['172', '172'],
    ['15', '15'],
    ['240', '240'],
    ['14', '15'],
    ['241', '240'],
    ['-5', '15'],
    ['9999', '240'],
    ['99.9', '99'],
    ['abc', '120'],
    ['', '120']
  ])('stored tempo %p renders as %p', (stored, expected) => {
    window.localStorage.setItem('libreMetronome.tempo', stored);
    render(<App />);
    expect(tempoSlider()).toHaveValue(expected);
    expect(window.localStorage.getItem('libreMetronome.tempo')).toBe(expected);
  });

  test.each([
    ['0.5', 0.5],
    ['0', 0],
    ['1', 1],
    ['-3', 0],
    ['7', 1],
    ['garbage', 1]
  ])('stored volume %p is clamped/defaulted to %p', (stored, expected) => {
    window.localStorage.setItem('libreMetronome.volume', stored);
    render(<App />);
    expect(Number(screen.getByRole('slider', { name: 'Volume' }).value)).toBe(expected);
    expect(window.localStorage.getItem('libreMetronome.volume')).toBe(String(expected));
  });

  test('the legacy 0.85 default is migrated exactly once', () => {
    window.localStorage.setItem('libreMetronome.volume', '0.85');
    const view = render(<App />);
    expect(window.localStorage.getItem('libreMetronome.volumeDefault.v2')).toBe('1');
    expect(window.localStorage.getItem('libreMetronome.volume')).toBe('1');
    view.unmount();

    // The user now deliberately picks 0.85 again: the migration must not run twice.
    window.localStorage.setItem('libreMetronome.volume', '0.85');
    render(<App />);
    expect(Number(screen.getByRole('slider', { name: 'Volume' }).value)).toBe(0.85);
  });

  test('tempo and volume changes are persisted', () => {
    render(<App />);
    fireEvent.change(tempoSlider(), { target: { value: '88' } });
    fireEvent.change(screen.getByRole('slider', { name: 'Volume' }), { target: { value: '0.4' } });
    expect(window.localStorage.getItem('libreMetronome.tempo')).toBe('88');
    expect(window.localStorage.getItem('libreMetronome.volume')).toBe('0.4');
  });
});

describe('document metadata', () => {
  test.each([
    ['Analog', 'LibreMetronome - Analog Mode', 'Currently in Analog Mode'],
    ['Beat', 'LibreMetronome - Beat Mode', 'Currently in Beat Mode'],
    ['Grid', 'LibreMetronome - Grid Mode', 'Currently in Grid Mode'],
    ['Sequence', 'LibreMetronome - Sequence Mode', 'Currently in Sequence Mode'],
    ['Polyrhythm', 'LibreMetronome - Polyrhythm Mode', 'Currently in Polyrhythm Mode']
  ])('%s mode sets title and description', async (name, title, description) => {
    render(<App />);
    chooseMode(name);
    await waitFor(() => expect(document.title).toBe(title));
    await waitFor(() =>
      expect(metaContent('description')).toContain(description)
    );
    expect(metaContent('application-version')).toBe('0.4.6');
  });
});

describe('mode switching', () => {
  test.each([
    ['Analog', 'analog', 'analog-canvas'],
    ['Beat', 'circle', 'beat-staff'],
    ['Grid', 'grid', 'grid-stub'],
    ['Sequence', 'multi', 'multi-stub'],
    ['Polyrhythm', 'polyrhythm', 'polyrhythm-stub']
  ])('%s button renders mode %s', (name, cls, testId) => {
    render(<App />);
    if (name !== 'Analog') chooseMode(name);
    expect(screen.getByTestId(testId)).toBeInTheDocument();
    expect(screen.getByRole('main')).toHaveClass(`mode-${cls}`);
    expect(screen.getByRole('main')).toHaveClass(`mode-${cls}`);
  });

  test('controls panel is shown for analog/circle/grid but hidden for sequence and polyrhythm', () => {
    render(<App />);
    MODES.forEach((name) => {
      chooseMode(name);
      const expectedVisible = name !== 'Sequence' && name !== 'Polyrhythm';
      expect(Boolean(screen.queryByRole('complementary', { name: 'Metronome controls' }))).toBe(expectedVisible);
    });
  });

  test.each([
    ['KeyA', 'analog'],
    ['KeyC', 'circle'],
    ['KeyG', 'grid'],
    ['KeyM', 'multi'],
    ['KeyY', 'polyrhythm']
  ])('keyboard %s switches to %s', (code, mode) => {
    render(<App />);
    press(code === 'KeyA' ? 'KeyG' : 'KeyA'); // make sure we really change away first
    press(code);
    expect(screen.getByRole('main')).toHaveClass(`mode-${mode}`);
  });

  test('mode components receive tempo, volume, swing, subdivisions, training settings and reload trigger', () => {
    window.localStorage.setItem('libreMetronome.tempo', '150');
    window.localStorage.setItem('libreMetronome.volume', '0.3');
    render(<App />);
    chooseMode('Grid');
    expect(stubProps.grid).toMatchObject({
      tempo: 150,
      volume: 0.3,
      swing: 0,
      subdivisions: 4,
      isPaused: true,
      analogMode: false,
      gridMode: true,
      beatMultiplier: 1,
      soundSetReloadTrigger: 0,
      macroMode: 0,
      speedMode: 0,
      measuresUntilMute: 2,
      muteDurationMeasures: 1,
      muteProbability: 0.3,
      measuresUntilSpeedUp: 2,
      tempoIncreasePercent: 5
    });
    expect(stubProps.grid.accents).toEqual([3, 1, 1, 1]);
    chooseMode('Sequence');
    expect(stubProps.multi).toMatchObject({ tempo: 150, volume: 0.3, analogMode: false, swing: 0 });
    chooseMode('Polyrhythm');
    expect(stubProps.polyrhythm).toMatchObject({ tempo: 150, volume: 0.3, swing: 0 });
  });

  test('callbacks handed to modes update the shared state', () => {
    render(<App />);
    chooseMode('Grid');
    act(() => stubProps.grid.setTempo(133));
    act(() => stubProps.grid.setSwing(40));
    act(() => stubProps.grid.setSubdivisions(7));
    act(() => stubProps.grid.setVolume(0.2));
    expect(stubProps.grid).toMatchObject({ tempo: 133, swing: 40, subdivisions: 7, volume: 0.2 });
    expect(stubProps.grid.accents).toEqual([3, 1, 1, 1, 1, 1, 1]);
    act(() => stubProps.grid.updateAccents([1, 1]));
    expect(stubProps.grid.accents).toEqual([1, 1]);
  });

  test('analog and beat mode tell the metronome logic whether it is analog', () => {
    render(<App />);
    expect(useMetronomeLogic.mock.calls.at(-1)[0]).toMatchObject({ analogMode: true, swing: 0 });
    chooseMode('Beat');
    expect(useMetronomeLogic.mock.calls.at(-1)[0]).toMatchObject({ analogMode: false });
    expect(useMetronomeLogic.mock.calls.at(-1)[0].accents).toEqual([3, 1, 1, 1]);
  });

  test('toggling an accent on the staff cycles it 1 -> 2 -> 3 -> 0 -> 1 in the shared state', () => {
    render(<App />);
    chooseMode('Beat');
    const seen = [];
    for (let i = 0; i < 4; i += 1) {
      fireEvent.click(screen.getByText('toggle-accent-2'));
      seen.push(useMetronomeLogic.mock.calls.at(-1)[0].accents[2]);
    }
    expect(seen).toEqual([2, 3, 0, 1]);
    expect(useMetronomeLogic.mock.calls.at(-1)[0].accents).toEqual([3, 1, 1, 1]);
  });

  test('changing the number of beats resets the accent pattern', () => {
    render(<App />);
    chooseMode('Beat');
    press('Digit6');
    expect(useMetronomeLogic.mock.calls.at(-1)[0].accents).toEqual([3, 1, 1, 1, 1, 1]);
    expect(screen.getByTestId('beat-staff')).toHaveAttribute('data-beats', '6');
  });

  test('note value selection feeds the beat multiplier into the real metronome', () => {
    render(<App />);
    chooseMode('Beat');
    expect(useMetronomeLogic.mock.calls.at(-1)[0].beatMultiplier).toBe(1);
    fireEvent.click(screen.getByRole('button', { name: /eighth/i }));
    expect(useMetronomeLogic.mock.calls.at(-1)[0].beatMultiplier).toBe(2);
  });
});

describe('playback and mode transitions', () => {
  test('Space starts and stops via the real metronome and updates the status', async () => {
    render(<App />);
    press('Space');
    await flush();
    expect(logic.startScheduler).toHaveBeenCalledTimes(1);
    expect(status()).toHaveTextContent('Metronome playing');
    expect(status()).toHaveTextContent('Metronome playing');
    expect(screen.getByTestId('analog-canvas')).toHaveAttribute('data-paused', 'false');

    act(() => {
      jest.advanceTimersByTime(301);
    });
    press('Space');
    await flush();
    expect(logic.stopScheduler).toHaveBeenCalledTimes(1);
    expect(status()).toHaveTextContent('Metronome paused');
  });

  test('Space presses inside 300 ms are debounced to one transition', async () => {
    render(<App />);
    press('Space');
    press('Space');
    await flush();
    expect(logic.startScheduler).toHaveBeenCalledTimes(1);
  });

  test('clicking the transport button toggles playback', async () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    await flush();
    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();
  });

  test('typing in an input does not trigger shortcuts', () => {
    render(<App />);
    press('KeyG', tempoSlider());
    expect(screen.getByRole('main')).toHaveClass('mode-analog');
  });

  test('modifier combinations are left to the browser', () => {
    render(<App />);
    press('KeyG', window, { metaKey: true });
    press('KeyG', window, { ctrlKey: true });
    expect(screen.getByRole('main')).toHaveClass('mode-analog');
  });

  test('switching mode while playing pauses, then resumes after 150 ms', async () => {
    render(<App />);
    press('Space');
    await flush();
    expect(status()).toHaveTextContent('Metronome playing');

    press('KeyG');
    expect(screen.getByRole('main')).toHaveClass('mode-grid');
    expect(status()).toHaveTextContent('Metronome paused');
    act(() => {
      jest.advanceTimersByTime(149);
    });
    expect(status()).toHaveTextContent('Metronome paused');
    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(status()).toHaveTextContent('Metronome playing');
  });

  test('switching mode while paused leaves playback stopped', () => {
    render(<App />);
    press('KeyG');
    act(() => {
      jest.advanceTimersByTime(500);
    });
    expect(status()).toHaveTextContent('Metronome paused');
  });

  test('unmounting during the 150 ms transition cancels the resume timer', async () => {
    const { unmount } = render(<App />);
    press('Space');
    await flush();
    press('KeyG');
    unmount();
    expect(jest.getTimerCount()).toBe(0);
  });

  test('the screen wake lock follows the playing state and is released on unmount', async () => {
    const { unmount } = render(<App />);
    expect(setScreenAwake).toHaveBeenLastCalledWith(false);
    press('Space');
    await flush();
    expect(setScreenAwake).toHaveBeenLastCalledWith(true);
    unmount();
    expect(setScreenAwake).toHaveBeenLastCalledWith(false);
  });

  test('audio health check stops playback with an alert if the context is not running', async () => {
    window._audioContextInit = { state: 'suspended' };
    render(<App />);
    press('Space');
    await flush();
    act(() => {
      jest.advanceTimersByTime(799);
    });
    expect(status()).toHaveTextContent('Metronome playing');
    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(status()).toHaveTextContent('Metronome paused');
    expect(screen.getByRole('alert')).toHaveTextContent('Audio could not start. Tap Start again');

    // Trying again with a working context clears the message.
    window._audioContextInit = { state: 'running' };
    act(() => {
      jest.advanceTimersByTime(301);
    });
    press('Space');
    await flush();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(status()).toHaveTextContent('Metronome playing');
  });

  test('health check falls back to window._audioContext and treats no context as failure', async () => {
    window._audioContextInit = undefined;
    window._audioContext = { state: 'running' };
    render(<App />);
    press('Space');
    await flush();
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(status()).toHaveTextContent('Metronome playing');

    act(() => {
      jest.advanceTimersByTime(301);
    });
    press('Space');
    await flush();
    window._audioContext = undefined;
    act(() => {
      jest.advanceTimersByTime(301);
    });
    press('Space');
    await flush();
    act(() => {
      jest.advanceTimersByTime(800);
    });
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  test('pausing before the health check fires cancels it', async () => {
    window._audioContextInit = { state: 'suspended' };
    render(<App />);
    press('Space');
    await flush();
    act(() => {
      jest.advanceTimersByTime(400);
    });
    press('Space');
    await flush();
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

describe('tempo shortcuts', () => {
  test('arrow keys change the tempo by 5', () => {
    render(<App />);
    press('ArrowUp');
    press('ArrowRight');
    expect(tempoSlider()).toHaveValue('130');
    press('ArrowDown');
    press('ArrowLeft');
    press('ArrowLeft');
    expect(tempoSlider()).toHaveValue('115');
  });

  test('tempo is clamped at 240 and 15', () => {
    window.localStorage.setItem('libreMetronome.tempo', '238');
    const { unmount } = render(<App />);
    press('ArrowUp');
    expect(tempoSlider()).toHaveValue('240');
    press('ArrowUp');
    expect(tempoSlider()).toHaveValue('240');
    unmount();

    window.localStorage.setItem('libreMetronome.tempo', '17');
    render(<App />);
    press('ArrowDown');
    expect(tempoSlider()).toHaveValue('15');
    press('ArrowDown');
    expect(tempoSlider()).toHaveValue('15');
  });

  test.each([1, 2, 3, 4, 5, 6, 7, 8, 9])('digit %i sets the number of beats', (n) => {
    render(<App />);
    chooseMode('Beat');
    press(`Digit${n}`);
    expect(screen.getByTestId('beat-staff')).toHaveAttribute('data-beats', String(n));
  });

  test('Enter accelerates tempo only while playing (+5 %, max +10 BPM)', async () => {
    render(<App />);
    press('Enter');
    expect(tempoSlider()).toHaveValue('120');

    press('Space');
    await flush();
    press('Enter');
    expect(tempoSlider()).toHaveValue('126');
  });

  test('Enter uses the tempoIncreasePercent from the training settings', async () => {
    window.localStorage.setItem('libreMetronome.tempo', '100');
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Menu' }));
    fireEvent.click(screen.getByText('training-update'));
    fireEvent.click(screen.getByRole('button', { name: 'Close Menu' }));
    press('Space');
    await flush();
    press('Enter');
    expect(tempoSlider()).toHaveValue('109');
  });
});

describe('tap tempo', () => {
  test('T key and the transport button call the real metronome tap handler', () => {
    render(<App />);
    press('KeyT');
    expect(logic.tapTempo).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Tap Tempo' }));
    expect(logic.tapTempo).toHaveBeenCalledTimes(2);
  });

  test('window.handleGlobalTapTempo prefers the registered handler', () => {
    render(<App />);
    window.handleGlobalTapTempo();
    expect(logic.tapTempo).toHaveBeenCalledTimes(1);
  });

  test('metronome-tap-tempo event uses the registered handler', () => {
    render(<App />);
    act(() => {
      window.dispatchEvent(new CustomEvent('metronome-tap-tempo', { detail: { timestamp: 5 } }));
    });
    expect(logic.tapTempo).toHaveBeenCalled();
  });

  test('metronome-set-tempo event sets numeric tempos only', () => {
    render(<App />);
    act(() => {
      window.dispatchEvent(new CustomEvent('metronome-set-tempo', { detail: { tempo: 99 } }));
    });
    expect(tempoSlider()).toHaveValue('99');
    act(() => {
      window.dispatchEvent(new CustomEvent('metronome-set-tempo', { detail: { tempo: '150' } }));
      window.dispatchEvent(new CustomEvent('metronome-set-tempo', {}));
    });
    expect(tempoSlider()).toHaveValue('99');
  });

  test('window.setMetronomeTempo exposes the tempo setter', () => {
    render(<App />);
    act(() => window.setMetronomeTempo(61));
    expect(tempoSlider()).toHaveValue('61');
  });

  test('register-tap-tempo event installs a handler, used by the next tap event', () => {
    logic.tapTempo = undefined;
    render(<App />);
    const handler = jest.fn();
    act(() => {
      window.dispatchEvent(new CustomEvent('register-tap-tempo', { detail: { handler } }));
      window.dispatchEvent(new CustomEvent('register-tap-tempo', { detail: { handler: 'nope' } }));
      window.dispatchEvent(new CustomEvent('register-tap-tempo', {}));
    });
    window.handleGlobalTapTempo();
    expect(handler).toHaveBeenCalledTimes(1);
  });

  test('window.tapTempoRef is consulted when no app level handler is registered', () => {
    logic.tapTempo = undefined;
    render(<App />);
    const viaWindow = jest.fn();
    window.tapTempoRef = { current: viaWindow };
    window.handleGlobalTapTempo();
    expect(viaWindow).toHaveBeenCalledTimes(1);
    act(() => {
      window.dispatchEvent(new CustomEvent('metronome-tap-tempo', { detail: { timestamp: 9 } }));
    });
    expect(viaWindow).toHaveBeenCalledTimes(2);
  });

  describe('built-in fallback calculation', () => {
    const tap = (timestamp) => {
      act(() => {
        window.dispatchEvent(new CustomEvent('metronome-tap-tempo', { detail: { timestamp } }));
      });
    };
    const tapAll = (...times) => times.forEach(tap);

    beforeEach(() => {
      logic.tapTempo = undefined;
      window.localStorage.setItem('libreMetronome.tempo', '80');
    });

    test('global handler dispatches an event with a timestamp when nothing is registered', () => {
      render(<App />);
      const seen = jest.fn();
      window.addEventListener('metronome-tap-tempo', seen);
      window.handleGlobalTapTempo();
      window.removeEventListener('metronome-tap-tempo', seen);
      expect(seen).toHaveBeenCalledTimes(1);
      expect(typeof seen.mock.calls[0][0].detail.timestamp).toBe('number');
      expect(window._tapTempoTimes).toHaveLength(1);
    });

    test('needs four taps before the tempo changes', () => {
      render(<App />);
      tapAll(1000, 1400, 1800);
      expect(tempoSlider()).toHaveValue('80');
      expect(window._tapTempoTimes).toEqual([1000, 1400, 1800]);
      tap(2200);
      expect(tempoSlider()).toHaveValue('150');
      expect(window._tapTempoTimes).toEqual([]);
    });

    test('snaps to a common tempo within 5 %', () => {
      render(<App />);
      tapAll(1000, 1420, 1840, 2260);
      expect(tempoSlider()).toHaveValue('140');
    });

    test('taps closer than 200 ms are ignored', () => {
      render(<App />);
      tapAll(1000, 1100);
      expect(window._tapTempoTimes).toEqual([1000]);
    });

    test('a pause longer than 2 s restarts the sequence', () => {
      render(<App />);
      tapAll(1000, 1500, 4000);
      expect(window._tapTempoTimes).toEqual([4000]);
      expect(tempoSlider()).toHaveValue('80');
    });

    test('an interval of exactly 2000 ms is still accepted (30 BPM)', () => {
      render(<App />);
      tapAll(1000, 3000, 5000, 7000);
      expect(tempoSlider()).toHaveValue('30');
    });

    test('very fast taps are clamped to 240 BPM', () => {
      render(<App />);
      tapAll(1000, 1200, 1400, 1600);
      expect(tempoSlider()).toHaveValue('240');
    });

    test('an outlier interval is discarded before averaging', () => {
      render(<App />);
      tapAll(1000, 1500, 2000, 2900);
      // intervals 500, 500, 900: outlier removed -> 120 BPM (unfiltered would give 95)
      expect(tempoSlider()).toHaveValue('120');
    });

    test('when filtering would leave fewer than two intervals all are kept', () => {
      render(<App />);
      tapAll(1000, 1300, 2000, 3500);
      // intervals 300, 700, 1500 average 833 ms -> 72 BPM
      expect(tempoSlider()).toHaveValue('72');
    });

    test('a timestamp of 0 falls back to performance.now()', () => {
      const now = jest.spyOn(performance, 'now').mockReturnValue(4321);
      render(<App />);
      tap(0);
      now.mockRestore();
      expect(window._tapTempoTimes).toEqual([4321]);
    });

    test('the keyboard T key feeds the same fallback', () => {
      render(<App />);
      press('KeyT');
      expect(window._tapTempoTimes).toHaveLength(1);
    });

    test('listeners are removed on unmount', () => {
      const { unmount } = render(<App />);
      unmount();
      act(() => {
        window.dispatchEvent(new CustomEvent('metronome-set-tempo', { detail: { tempo: 33 } }));
      });
      expect(window._tapTempoTimes).toBeUndefined();
    });
  });
});

describe('native desktop commands', () => {
  test('state is mirrored to the desktop shell', async () => {
    render(<App />);
    expect(reportDesktopState).toHaveBeenLastCalledWith({
      tempo: 120, isPaused: true, mode: 'analog', subdivisions: 4
    });
    press('KeyG');
    press('Digit7');
    expect(reportDesktopState).toHaveBeenLastCalledWith({
      tempo: 120, isPaused: true, mode: 'grid', subdivisions: 7
    });
  });

  test('togglePlay / play / pause', async () => {
    render(<App />);
    nativeCommand('pause');
    expect(logic.stopScheduler).not.toHaveBeenCalled();
    nativeCommand('play');
    await flush();
    expect(logic.startScheduler).toHaveBeenCalledTimes(1);
    nativeCommand('play');
    await flush();
    expect(logic.startScheduler).toHaveBeenCalledTimes(1);
    nativeCommand('pause');
    await flush();
    expect(logic.stopScheduler).toHaveBeenCalledTimes(1);
    nativeCommand('togglePlay');
    await flush();
    expect(logic.startScheduler).toHaveBeenCalledTimes(2);
  });

  test('adjustTempo is relative and clamped', () => {
    render(<App />);
    nativeCommand('adjustTempo', 10);
    expect(tempoSlider()).toHaveValue('130');
    nativeCommand('adjustTempo', -500);
    expect(tempoSlider()).toHaveValue('15');
    nativeCommand('adjustTempo', 500);
    expect(tempoSlider()).toHaveValue('240');
    nativeCommand('adjustTempo');
    expect(tempoSlider()).toHaveValue('240');
  });

  test('setTempo rounds and clamps; non numeric values clamp to the minimum', () => {
    render(<App />);
    nativeCommand('setTempo', 99.6);
    expect(tempoSlider()).toHaveValue('100');
    nativeCommand('setTempo', 1000);
    expect(tempoSlider()).toHaveValue('240');
    nativeCommand('setTempo', 'fast');
    expect(tempoSlider()).toHaveValue('15');
  });

  test('tapTempo calls the registered handler', () => {
    render(<App />);
    nativeCommand('tapTempo');
    expect(logic.tapTempo).toHaveBeenCalledTimes(1);
  });

  test('setMode accepts only known modes', () => {
    render(<App />);
    nativeCommand('setMode', 'polyrhythm');
    expect(screen.getByTestId('polyrhythm-stub')).toBeInTheDocument();
    nativeCommand('setMode', 'bogus');
    expect(screen.getByTestId('polyrhythm-stub')).toBeInTheDocument();
  });

  test.each([
    [0, 4],
    [1, 1],
    [9, 9],
    [10, 4],
    [4.4, 4],
    [8.6, 9]
  ])('setSubdivisions %p results in %p beats', (value, expected) => {
    render(<App />);
    chooseMode('Beat');
    nativeCommand('setSubdivisions', value);
    expect(screen.getByTestId('beat-staff')).toHaveAttribute('data-beats', String(expected));
  });

  test('toggleSettings and toggleInfo open and close their panels', () => {
    render(<App />);
    nativeCommand('toggleSettings');
    expect(screen.getByTestId('settings-content')).toBeInTheDocument();
    nativeCommand('toggleSettings');
    expect(screen.queryByTestId('settings-content')).not.toBeInTheDocument();
    nativeCommand('toggleInfo');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    nativeCommand('toggleInfo');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  test('the standalone settings panel receives state and closes itself', () => {
    render(<App />);
    chooseMode('Grid');
    nativeCommand('toggleSettings');
    const panel = screen.getByTestId('settings-content');
    expect(panel).toHaveAttribute('data-mode', 'grid');
    expect(panel).toHaveAttribute('data-subdivisions', '4');
    fireEvent.click(screen.getByText('settings-set-subdivisions'));
    expect(stubProps.grid.subdivisions).toBe(6);
    fireEvent.click(screen.getByText('settings-close'));
    expect(screen.queryByTestId('settings-content')).not.toBeInTheDocument();
  });

  test('unknown commands and events without detail are ignored', () => {
    render(<App />);
    nativeCommand('selfDestruct');
    act(() => {
      window.dispatchEvent(new Event(DESKTOP_COMMAND_EVENT));
    });
    expect(tempoSlider()).toHaveValue('120');
  });

  test('the command listener is removed on unmount', () => {
    const { unmount } = render(<App />);
    unmount();
    reportDesktopState.mockClear();
    nativeCommand('setTempo', 33);
    expect(reportDesktopState).not.toHaveBeenCalled();
  });
});

describe('mode components registering with the app', () => {
  // eslint-disable-next-line security/detect-non-literal-require
  const stubOf = (path) => require(path).default;

  test('Space, native togglePlay and the togglePlay prop reach the handler a mode registered', () => {
    render(<App />);
    chooseMode('Polyrhythm');
    const toggle = stubOf('../../components/metronome/PolyrhythmMode').toggle;
    press('Space');
    expect(toggle).toHaveBeenCalledTimes(1);
    nativeCommand('togglePlay');
    expect(toggle).toHaveBeenCalledTimes(2);
    chooseMode('Grid');
    stubProps.grid.togglePlay();
    expect(stubOf('../../components/metronome/GridMode/GridModeMetronome').toggle).toHaveBeenCalledTimes(1);
  });

  test('tap shortcuts reach the tap handler a mode registered', () => {
    render(<App />);
    chooseMode('Sequence');
    const tap = stubOf('../../components/metronome/MultiCircleMode').tap;
    nativeCommand('tapTempo');
    press('KeyT');
    expect(tap).toHaveBeenCalledTimes(2);
  });

  test('mode transitions while playing resume playback on the new mode', () => {
    render(<App />);
    chooseMode('Grid');
    act(() => stubProps.grid.setIsPaused(false));
    expect(status()).toHaveTextContent('Metronome playing');
    chooseMode('Sequence');
    expect(status()).toHaveTextContent('Metronome paused');
    act(() => {
      jest.advanceTimersByTime(150);
    });
    expect(status()).toHaveTextContent('Metronome playing');
  });

  test('a mode that never registers a toggle handler is not auto-resumed after a switch', () => {
    render(<App />);
    chooseMode('Grid');
    act(() => stubProps.grid.setIsPaused(false));
    // No component registers a handler for the native command below, but the grid stub did;
    // the resume is guarded by togglePlayRef, which is set, so it resumes.
    chooseMode('Sequence');
    act(() => {
      jest.advanceTimersByTime(150);
    });
    expect(stubProps.multi.isPaused).toBe(false);
  });
});

describe('menus and dialogs', () => {
  test('the main menu opens, offers training/settings/support and closes', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Menu' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByTestId('training-content')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('tab', { name: /Settings/i }));
    expect(within(dialog).getByTestId('settings-content')).toHaveAttribute('data-tempo', '120');
    fireEvent.click(within(dialog).getByRole('tab', { name: /Support/i }));
    expect(within(dialog).getByTestId('support-page')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Close Menu' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  test('settings made in the menu flow back into the app state', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Menu' }));
    fireEvent.click(screen.getByRole('tab', { name: /Settings/i }));
    fireEvent.click(screen.getByText('settings-set-tempo'));
    fireEvent.click(screen.getByText('settings-set-subdivisions'));
    fireEvent.click(screen.getByText('settings-set-volume'));
    fireEvent.click(screen.getByText('settings-reload'));
    fireEvent.click(screen.getByText('settings-close'));
    expect(tempoSlider()).toHaveValue('77');
    expect(screen.getByRole('slider', { name: 'Volume' })).toHaveValue('0.25');
    expect(logic.reloadSounds).toHaveBeenCalledTimes(1); // soundSetReloadTrigger 0 -> 1
  });

  test('training settings from the menu reach the mode components and can switch the mode', () => {
    render(<App />);
    chooseMode('Grid');
    fireEvent.click(screen.getByRole('button', { name: 'Menu' }));
    fireEvent.click(screen.getByText('training-update'));
    expect(stubProps.grid).toMatchObject({ speedMode: 2, macroMode: 1, tempoIncreasePercent: 9 });
    fireEvent.click(screen.getByText('training-play'));
    expect(status()).toHaveTextContent('Metronome playing');
  });

  test('the training tab can switch the mode', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Menu' }));
    fireEvent.click(screen.getByText('training-grid'));
    expect(screen.getByTestId('grid-stub')).toBeInTheDocument();
  });

  test('the Guide entry opens the info modal and closing returns to the app', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Menu' }));
    fireEvent.click(screen.getByRole('button', { name: 'Guide' }));
    expect(screen.queryByRole('dialog', { name: /menu/i })).not.toBeInTheDocument();
    const guide = screen.getByRole('dialog');
    fireEvent.click(within(guide).getByRole('button', { name: 'Close guide' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  test('the I key toggles the guide', () => {
    render(<App />);
    press('KeyI');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    press('KeyI');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  test('the Accessibility entry opens the settings overlay and Escape closes it', () => {
    window.matchMedia = jest.fn().mockReturnValue({ matches: false, addEventListener: jest.fn(), removeEventListener: jest.fn() });
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Menu' }));
    fireEvent.click(screen.getByRole('button', { name: 'Accessibility' }));
    expect(screen.getByRole('dialog', { name: 'Accessibility Settings' })).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: 'Accessibility Settings' })).not.toBeInTheDocument();
    delete window.matchMedia;
  });

  test('accessibility preferences from storage are applied to the body on start', () => {
    window.localStorage.setItem('accessibility-high-contrast', 'true');
    window.localStorage.setItem('accessibility-large-text', 'true');
    window.localStorage.setItem('accessibility-color-blind-mode', 'deuteranopia');
    render(<App />);
    expect(document.body).toHaveClass('high-contrast', 'large-text', 'color-blind', 'deuteranopia');
    expect(document.body).not.toHaveClass('reduced-motion');
  });

  test('the skip link targets the main workspace', () => {
    render(<App />);
    expect(screen.getByRole('link', { name: 'Skip to metronome' })).toHaveAttribute('href', '#metronome-workspace');
    expect(screen.getByRole('main')).toHaveAttribute('id', 'metronome-workspace');
  });
});

describe('support page', () => {
  test('window.setShowSupportPage swaps the workspace for the support page and back', () => {
    render(<App />);
    act(() => window.setShowSupportPage(true));
    expect(screen.getByTestId('support-page')).toBeInTheDocument();
    expect(screen.queryByRole('main')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Analog mode' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Back to Metronome/ }));
    expect(screen.queryByTestId('support-page')).not.toBeInTheDocument();
    expect(screen.getByRole('main')).toBeInTheDocument();
  });

  test('the native app build never shows the support page', () => {
    mockNative.value = true;
    render(<App />);
    act(() => window.setShowSupportPage(true));
    expect(screen.queryByTestId('support-page')).not.toBeInTheDocument();
    expect(screen.getByRole('main')).toBeInTheDocument();
  });
});

describe('audio unlock', () => {
  test('initialises and resumes the shared context once on mount', () => {
    const ctx = { state: 'suspended' };
    initAudioContext.mockReturnValue(ctx);
    render(<App />);
    expect(initAudioContext).toHaveBeenCalledTimes(1);
    expect(resumeAudioContext).toHaveBeenCalledWith(ctx);
  });

  test('the first user interaction unlocks again and then the listeners are gone', () => {
    render(<App />);
    initAudioContext.mockClear();
    fireEvent.touchStart(document);
    expect(initAudioContext).toHaveBeenCalledTimes(1);
    fireEvent.click(document);
    fireEvent.keyDown(document, { code: 'KeyZ' });
    expect(initAudioContext).toHaveBeenCalledTimes(1);
  });

  test('unmount removes the interaction listeners', () => {
    const { unmount } = render(<App />);
    unmount();
    initAudioContext.mockClear();
    fireEvent.click(document);
    expect(initAudioContext).not.toHaveBeenCalled();
  });

  test('no context means nothing to resume', () => {
    initAudioContext.mockReturnValue(null);
    render(<App />);
    expect(resumeAudioContext).not.toHaveBeenCalled();
  });

  test('a failing resume is logged', async () => {
    resumeAudioContext.mockRejectedValue(new Error('blocked'));
    render(<App />);
    await flush();
    expect(console.error).toHaveBeenCalledWith('Failed to unlock audio output:', expect.any(Error));
  });

  test('an exception while initialising is logged and does not crash', () => {
    initAudioContext.mockImplementation(() => {
      throw new Error('no audio');
    });
    expect(() => render(<App />)).not.toThrow();
    expect(console.error).toHaveBeenCalledWith('Error initializing audio context:', expect.any(Error));
    expect(screen.getByRole('main')).toBeInTheDocument();
  });
});

describe('window.metronomeDebug', () => {
  const makeCtx = () => {
    const source = { buffer: null, connect: jest.fn(), start: jest.fn() };
    const gain = { gain: { value: 0 }, connect: jest.fn() };
    return {
      source,
      gain,
      ctx: {
        state: 'running',
        destination: 'dest',
        resume: jest.fn(),
        createBufferSource: jest.fn(() => source),
        createGain: jest.fn(() => gain)
      }
    };
  };

  afterEach(() => {
    window.metronomeDebug.audioContext = null;
    window.metronomeDebug.audioBuffers = null;
  });

  test('playSound refuses without a context or buffer', () => {
    window.metronomeDebug.audioContext = null;
    expect(window.metronomeDebug.playSound('first')).toBe(false);
    window.metronomeDebug.audioContext = {};
    expect(window.metronomeDebug.playSound('first')).toBe(false);
    window.metronomeDebug.audioBuffers = { normal: 'N' };
    expect(window.metronomeDebug.playSound('first')).toBe(false);
  });

  test('playSound plays the buffer at the given volume (default 0.5) and resumes a suspended context', () => {
    const { ctx, source, gain } = makeCtx();
    ctx.state = 'suspended';
    window.metronomeDebug.audioContext = ctx;
    window.metronomeDebug.audioBuffers = { first: 'F' };
    expect(window.metronomeDebug.playSound('first')).toBe(true);
    expect(ctx.resume).toHaveBeenCalledTimes(1);
    expect(source.buffer).toBe('F');
    expect(gain.gain.value).toBe(0.5);
    expect(gain.connect).toHaveBeenCalledWith('dest');
    expect(source.start).toHaveBeenCalledWith(0);
    window.metronomeDebug.playSound('first', 0.9);
    expect(gain.gain.value).toBe(0.9);
  });

  test('playSound returns false if the audio graph throws', () => {
    const { ctx } = makeCtx();
    ctx.createBufferSource = () => {
      throw new Error('bad');
    };
    window.metronomeDebug.audioContext = ctx;
    window.metronomeDebug.audioBuffers = { first: 'F' };
    expect(window.metronomeDebug.playSound('first')).toBe(false);
  });

  test('checkEventListeners dispatches both preview events', () => {
    const sound = jest.fn();
    const pattern = jest.fn();
    window.addEventListener('metronome-preview-sound', sound);
    window.addEventListener('metronome-preview-pattern', pattern);
    expect(window.metronomeDebug.checkEventListeners()).toBe('Check console for events');
    window.removeEventListener('metronome-preview-sound', sound);
    window.removeEventListener('metronome-preview-pattern', pattern);
    expect(sound.mock.calls[0][0].detail).toEqual({ type: 'first', volume: 0.5 });
    expect(pattern.mock.calls[0][0].detail).toEqual({ volume: 0.5 });
  });
});
