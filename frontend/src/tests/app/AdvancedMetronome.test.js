import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import ConnectedMetronome, {
  AdvancedMetronomeWithCircle
} from '../../components/AdvancedMetronome';
import useMetronomeLogic from '../../hooks/useMetronomeLogic';
import { manualTempoAcceleration } from '../../hooks/useMetronomeLogic/trainingLogic';

jest.mock('../../hooks/useMetronomeLogic', () => ({
  __esModule: true,
  default: jest.fn()
}));

jest.mock('../../hooks/useMetronomeLogic/tapFeedback', () => ({
  playTapFeedback: jest.fn()
}));

jest.mock('../../utils/layoutSize', () => ({
  useVizCardSize: jest.fn()
}));

jest.mock('../../hooks/useMetronomeLogic/trainingLogic', () => ({
  manualTempoAcceleration: jest.fn()
}));

jest.mock('../../components/Training/withTrainingContainer', () => ({
  __esModule: true,
  default: jest.fn((Component) => {
    const Wrapped = (props) => <Component {...props} wrapped="yes" />;
    return Wrapped;
  })
}));

jest.mock('../../components/metronome/AnalogMode/AnalogMetronomeCanvas', () => ({
  __esModule: true,
  default: (props) => (
    <div
      data-testid="analog-canvas"
      data-paused={String(props.isPaused)}
      data-tempo={props.tempo}
      data-multiplier={props.beatMultiplier}
      data-width={props.width}
      data-height={props.height}
    />
  )
}));

jest.mock('../../components/metronome/Score/BeatStaff', () => ({
  __esModule: true,
  default: (props) => (
    <div
      data-testid="beat-staff"
      data-beats={props.beats}
      data-accents={props.accents.join(',')}
      data-current={props.current}
      data-eighth={String(props.eighth)}
      data-tempo={props.tempo}
    >
      <button type="button" onClick={() => props.onToggle(1)}>toggle-accent-1</button>
    </div>
  )
}));

const { useVizCardSize } = require('../../utils/layoutSize');

const flush = async () => {
  await act(async () => {
    await Promise.resolve();
  });
};

const makeLogic = (overrides = {}) => ({
  audioCtx: { state: 'running', resume: jest.fn().mockResolvedValue(), destination: {} },
  audioBuffers: { first: 'F', normal: 'N', accent: 'A' },
  normalBufferRef: { current: {} },
  accentBufferRef: { current: {} },
  firstBufferRef: { current: {} },
  reloadSounds: jest.fn().mockResolvedValue(true),
  startScheduler: jest.fn(),
  stopScheduler: jest.fn(),
  tapTempo: jest.fn(),
  updateBeatMultiplier: jest.fn(),
  currentSubdivision: 2,
  ...overrides
});

const baseProps = (overrides = {}) => ({
  tempo: 100,
  setTempo: jest.fn(),
  subdivisions: 4,
  setSubdivisions: jest.fn(),
  isPaused: true,
  setIsPaused: jest.fn(),
  swing: 30,
  setSwing: jest.fn(),
  volume: 0.7,
  setVolume: jest.fn(),
  ...overrides
});

let logic;
let logSpies;

beforeEach(() => {
  jest.useFakeTimers();
  logic = makeLogic();
  useMetronomeLogic.mockImplementation(() => logic);
  useVizCardSize.mockReturnValue([{ current: null }, { width: 320, height: 180 }]);
  manualTempoAcceleration.mockClear();
  logSpies = ['log', 'warn', 'error'].map((m) => jest.spyOn(console, m).mockImplementation(() => {}));
  delete window.tapTempoRef;
  delete window.handleGlobalTapTempo;
  delete window.handleGlobalPlayPause;
  window.metronomeDebug = { audioBuffers: null, audioContext: null };
});

afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
  logSpies.forEach((s) => s.mockRestore());
  useMetronomeLogic.mockReset();
});

describe('AdvancedMetronome rendering and logic wiring', () => {
  test('passes tempo, volume and training settings to useMetronomeLogic (circle mode keeps swing)', () => {
    render(
      <AdvancedMetronomeWithCircle
        {...baseProps()}
        macroMode={1}
        speedMode={2}
        measuresUntilMute={3}
        muteDurationMeasures={2}
        muteProbability={0.5}
        tempoIncreasePercent={7}
        measuresUntilSpeedUp={6}
        beatMultiplier={2}
        gridMode
      />
    );
    const args = useMetronomeLogic.mock.calls[0][0];
    expect(args).toMatchObject({
      tempo: 100,
      subdivisions: 4,
      swing: 30,
      volume: 0.7,
      analogMode: false,
      gridMode: true,
      macroMode: 1,
      speedMode: 2,
      measuresUntilMute: 3,
      muteDurationMeasures: 2,
      muteProbability: 0.5,
      tempoIncreasePercent: 7,
      measuresUntilSpeedUp: 6,
      beatMultiplier: 2
    });
    expect(args.accents).toEqual([3, 1, 1, 1]);
  });

  test('analog mode forces swing to 0 and ignores setSwing', () => {
    const props = baseProps();
    render(<AdvancedMetronomeWithCircle {...props} analogMode />);
    const args = useMetronomeLogic.mock.calls[0][0];
    expect(args.swing).toBe(0);
    args.setSwing(55);
    expect(props.setSwing).not.toHaveBeenCalled();
  });

  test('non-analog mode forwards setSwing', () => {
    const props = baseProps();
    render(<AdvancedMetronomeWithCircle {...props} />);
    useMetronomeLogic.mock.calls[0][0].setSwing(55);
    expect(props.setSwing).toHaveBeenCalledWith(55);
  });

  test('renders the analog canvas with measured size in analog mode', () => {
    render(<AdvancedMetronomeWithCircle {...baseProps({ isPaused: false })} analogMode />);
    const canvas = screen.getByTestId('analog-canvas');
    expect(canvas).toHaveAttribute('data-width', '320');
    expect(canvas).toHaveAttribute('data-height', '180');
    expect(canvas).toHaveAttribute('data-paused', 'false');
    expect(canvas).toHaveAttribute('data-tempo', '100');
    expect(screen.queryByTestId('beat-staff')).not.toBeInTheDocument();
  });

  test('renders the beat staff with the current subdivision only while playing', () => {
    const { rerender } = render(<AdvancedMetronomeWithCircle {...baseProps({ isPaused: true })} />);
    expect(screen.getByTestId('beat-staff')).toHaveAttribute('data-current', '-1');
    rerender(<AdvancedMetronomeWithCircle {...baseProps({ isPaused: false })} />);
    expect(screen.getByTestId('beat-staff')).toHaveAttribute('data-current', '2');
    expect(screen.getByTestId('beat-staff')).toHaveAttribute('data-eighth', 'false');
  });

  test('renders nothing inside the card while the visualisation area has no size', () => {
    useVizCardSize.mockReturnValue([{ current: null }, { width: 0, height: 0 }]);
    render(<AdvancedMetronomeWithCircle {...baseProps()} />);
    expect(screen.queryByTestId('beat-staff')).not.toBeInTheDocument();
    expect(screen.queryByTestId('analog-canvas')).not.toBeInTheDocument();
  });

  test('the training HOC wraps the default export', () => {
    render(<ConnectedMetronome {...baseProps()} />);
    expect(screen.getByTestId('beat-staff')).toBeInTheDocument();
    expect(useMetronomeLogic).toHaveBeenCalled();
  });
});

describe('accents', () => {
  test('uses local accents and toggles them cyclically (0..3) when the parent supplies none', () => {
    render(<AdvancedMetronomeWithCircle {...baseProps({ subdivisions: 3 })} />);
    expect(screen.getByTestId('beat-staff')).toHaveAttribute('data-accents', '3,1,1');
    fireEvent.click(screen.getByText('toggle-accent-1'));
    expect(screen.getByTestId('beat-staff')).toHaveAttribute('data-accents', '3,2,1');
    fireEvent.click(screen.getByText('toggle-accent-1'));
    fireEvent.click(screen.getByText('toggle-accent-1'));
    expect(screen.getByTestId('beat-staff')).toHaveAttribute('data-accents', '3,0,1');
  });

  test('local accents are rebuilt when the subdivision count changes and kept when it does not', () => {
    const props = baseProps({ subdivisions: 3 });
    const { rerender } = render(<AdvancedMetronomeWithCircle {...props} />);
    fireEvent.click(screen.getByText('toggle-accent-1'));
    rerender(<AdvancedMetronomeWithCircle {...props} tempo={101} />);
    expect(screen.getByTestId('beat-staff')).toHaveAttribute('data-accents', '3,2,1');
    rerender(<AdvancedMetronomeWithCircle {...props} subdivisions={5} />);
    expect(screen.getByTestId('beat-staff')).toHaveAttribute('data-accents', '3,1,1,1,1');
  });

  test('parent supplied accents and toggle callback take precedence', () => {
    const toggleAccent = jest.fn();
    render(
      <AdvancedMetronomeWithCircle
        {...baseProps()}
        accents={[3, 0, 2, 1]}
        toggleAccent={toggleAccent}
      />
    );
    expect(screen.getByTestId('beat-staff')).toHaveAttribute('data-accents', '3,0,2,1');
    fireEvent.click(screen.getByText('toggle-accent-1'));
    expect(toggleAccent).toHaveBeenCalledWith(1);
    expect(useMetronomeLogic.mock.calls[0][0].accents).toEqual([3, 0, 2, 1]);
  });

  test('analog mode keeps the default accents handed to the logic', () => {
    render(<AdvancedMetronomeWithCircle {...baseProps()} analogMode />);
    expect(useMetronomeLogic.mock.calls[0][0].accents).toEqual([3, 1, 1, 1]);
  });
});

describe('play / pause', () => {
  test('starting resumes nothing when running, sets isPaused=false and starts the scheduler', async () => {
    const props = baseProps();
    render(<AdvancedMetronomeWithCircle {...props} />);
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    await flush();
    expect(props.setIsPaused).toHaveBeenCalledWith(false);
    expect(logic.startScheduler).toHaveBeenCalledTimes(1);
    expect(logic.audioCtx.resume).not.toHaveBeenCalled();
    expect(logic.reloadSounds).not.toHaveBeenCalled();
  });

  test('pausing sets isPaused=true and stops the scheduler; button reflects state', () => {
    const props = baseProps({ isPaused: false });
    render(<AdvancedMetronomeWithCircle {...props} />);
    const button = screen.getByRole('button', { name: 'Pause' });
    expect(button).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(button);
    expect(props.setIsPaused).toHaveBeenCalledWith(true);
    expect(logic.stopScheduler).toHaveBeenCalledTimes(1);
    expect(logic.startScheduler).not.toHaveBeenCalled();
  });

  test('a suspended context is resumed before starting', async () => {
    logic.audioCtx.state = 'suspended';
    logic.audioCtx.resume = jest.fn().mockImplementation(() => {
      logic.audioCtx.state = 'running';
      return Promise.resolve();
    });
    const props = baseProps();
    render(<AdvancedMetronomeWithCircle {...props} />);
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    await flush();
    expect(logic.audioCtx.resume).toHaveBeenCalledTimes(1);
    expect(logic.startScheduler).toHaveBeenCalledTimes(1);
  });

  test('a failing resume is tolerated (warned) and playback still starts', async () => {
    logic.audioCtx.state = 'suspended';
    logic.audioCtx.resume = jest.fn().mockRejectedValue(new Error('denied'));
    const props = baseProps();
    render(<AdvancedMetronomeWithCircle {...props} />);
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    await flush();
    await flush();
    // first resume + final attempt because the state is still not running
    expect(logic.audioCtx.resume).toHaveBeenCalledTimes(2);
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('Error resuming audio context'),
      expect.any(Error)
    );
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('Final resume attempt failed'),
      expect.any(Error)
    );
    expect(props.setIsPaused).toHaveBeenCalledWith(false);
    expect(logic.startScheduler).toHaveBeenCalled();
  });

  test('without an audio context sounds are initialised via reloadSounds first', async () => {
    logic.audioCtx = null;
    const props = baseProps();
    render(<AdvancedMetronomeWithCircle {...props} />);
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    await flush();
    expect(logic.reloadSounds).toHaveBeenCalledTimes(1);
    expect(logic.startScheduler).toHaveBeenCalledTimes(1);
  });

  test('missing buffers trigger a reload; a rejected reload is only warned about', async () => {
    logic.normalBufferRef = { current: null };
    logic.reloadSounds = jest.fn().mockRejectedValue(new Error('boom'));
    const props = baseProps();
    render(<AdvancedMetronomeWithCircle {...props} />);
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    await flush();
    expect(logic.reloadSounds).toHaveBeenCalledTimes(1);
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('Error loading sounds'),
      expect.any(Error)
    );
    expect(logic.startScheduler).toHaveBeenCalled();
  });

  test('a rejected initial reload (no context) is only warned about', async () => {
    logic.audioCtx = null;
    logic.reloadSounds = jest.fn().mockRejectedValue(new Error('nope'));
    const props = baseProps();
    render(<AdvancedMetronomeWithCircle {...props} />);
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    await flush();
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('Error initializing sounds'),
      expect.any(Error)
    );
    expect(props.setIsPaused).toHaveBeenCalledWith(false);
  });

  test('an unexpected error still ends with playback being started', async () => {
    // Accessing audioCtx.state throws -> caught by the outer try/catch.
    logic.audioCtx = {
      get state() { throw new Error('exploded'); }
    };
    const props = baseProps();
    render(<AdvancedMetronomeWithCircle {...props} />);
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    await flush();
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('Error starting playback'),
      expect.any(Error)
    );
    expect(props.setIsPaused).toHaveBeenCalledWith(false);
    expect(logic.startScheduler).toHaveBeenCalledTimes(1);
  });

  test('registerTogglePlay receives a handler that toggles playback', async () => {
    const registerTogglePlay = jest.fn();
    const props = baseProps();
    render(<AdvancedMetronomeWithCircle {...props} registerTogglePlay={registerTogglePlay} />);
    expect(registerTogglePlay).toHaveBeenCalledTimes(1);
    await act(async () => {
      await registerTogglePlay.mock.calls[0][0]();
    });
    expect(logic.startScheduler).toHaveBeenCalledTimes(1);
  });
});

describe('global events and window hooks', () => {
  test('metronome-toggle-play event toggles playback, errors are caught', async () => {
    const props = baseProps({ isPaused: false });
    render(<AdvancedMetronomeWithCircle {...props} />);
    act(() => {
      window.dispatchEvent(new CustomEvent('metronome-toggle-play'));
    });
    expect(logic.stopScheduler).toHaveBeenCalledTimes(1);

    logic.stopScheduler.mockImplementation(() => {
      throw new Error('stop failed');
    });
    act(() => {
      window.dispatchEvent(new CustomEvent('metronome-toggle-play'));
    });
    await flush();
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('Error in global play/pause handler'),
      expect.any(Error)
    );
  });

  test('window.handleGlobalPlayPause toggles playback and reports errors', async () => {
    const props = baseProps({ isPaused: false });
    render(<AdvancedMetronomeWithCircle {...props} />);
    act(() => {
      window.handleGlobalPlayPause();
    });
    expect(logic.stopScheduler).toHaveBeenCalledTimes(1);
    logic.stopScheduler.mockImplementation(() => {
      throw new Error('x');
    });
    act(() => {
      window.handleGlobalPlayPause();
    });
    await flush();
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('Error in global play handler'),
      expect.any(Error)
    );
  });

  test('listeners are removed on unmount', () => {
    const props = baseProps({ isPaused: false });
    const { unmount } = render(<AdvancedMetronomeWithCircle {...props} />);
    unmount();
    window.dispatchEvent(new CustomEvent('metronome-toggle-play'));
    window.dispatchEvent(new CustomEvent('soundSetChanged', { detail: { soundSetId: 'x' } }));
    window.dispatchEvent(new CustomEvent('metronome-settings-applied'));
    window.dispatchEvent(new CustomEvent('beat-mode-change', { detail: { beatMultiplier: 2 } }));
    expect(logic.stopScheduler).not.toHaveBeenCalled();
    expect(logic.reloadSounds).not.toHaveBeenCalled();
    expect(logic.updateBeatMultiplier).not.toHaveBeenCalled();
  });

  test('soundSetChanged reloads sounds, also while paused, and logs failure outcomes', async () => {
    render(<AdvancedMetronomeWithCircle {...baseProps()} />);
    await act(async () => {
      window.dispatchEvent(new CustomEvent('soundSetChanged', { detail: { soundSetId: 'wood' } }));
    });
    expect(logic.reloadSounds).toHaveBeenCalledTimes(1);

    logic.reloadSounds.mockResolvedValueOnce(false);
    await act(async () => {
      window.dispatchEvent(new CustomEvent('soundSetChanged', {}));
    });
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('Failed to reload sound buffers after sound set change')
    );

    logic.reloadSounds.mockRejectedValueOnce(new Error('bad'));
    await act(async () => {
      window.dispatchEvent(new CustomEvent('soundSetChanged', { detail: {} }));
    });
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('Error reloading sounds after sound set change'),
      expect.any(Error)
    );
  });

  test('soundSetChanged without reloadSounds is ignored', () => {
    logic.reloadSounds = undefined;
    render(<AdvancedMetronomeWithCircle {...baseProps()} />);
    expect(() => {
      window.dispatchEvent(new CustomEvent('soundSetChanged', { detail: {} }));
    }).not.toThrow();
  });

  test('metronome-settings-applied reloads only while playing', async () => {
    const { rerender } = render(<AdvancedMetronomeWithCircle {...baseProps({ isPaused: true })} />);
    await act(async () => {
      window.dispatchEvent(new CustomEvent('metronome-settings-applied'));
    });
    expect(logic.reloadSounds).not.toHaveBeenCalled();

    rerender(<AdvancedMetronomeWithCircle {...baseProps({ isPaused: false })} />);
    await act(async () => {
      window.dispatchEvent(new CustomEvent('metronome-settings-applied'));
    });
    expect(logic.reloadSounds).toHaveBeenCalledTimes(1);

    logic.reloadSounds.mockRejectedValueOnce(new Error('late'));
    await act(async () => {
      window.dispatchEvent(new CustomEvent('metronome-settings-applied'));
    });
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('Error reloading sounds while playing'),
      expect.any(Error)
    );
  });

  test('training-mode-toggle is re-broadcast as training-settings-update', () => {
    render(<AdvancedMetronomeWithCircle {...baseProps()} />);
    const received = jest.fn();
    window.addEventListener('training-settings-update', received);
    window.dispatchEvent(
      new CustomEvent('training-mode-toggle', { detail: { type: 'macroMode', newValue: 2 } })
    );
    window.removeEventListener('training-settings-update', received);
    expect(received).toHaveBeenCalledTimes(1);
    expect(received.mock.calls[0][0].detail).toEqual({ macroMode: 2 });
  });
});

describe('beat mode changes', () => {
  test('beat-mode-change updates the multiplier, the logic and restarts the scheduler when playing', () => {
    render(<AdvancedMetronomeWithCircle {...baseProps({ isPaused: false })} />);
    expect(screen.getByTestId('beat-staff')).toHaveAttribute('data-eighth', 'false');
    act(() => {
      window.dispatchEvent(new CustomEvent('beat-mode-change', { detail: { beatMultiplier: 2 } }));
    });
    expect(screen.getByTestId('beat-staff')).toHaveAttribute('data-eighth', 'true');
    expect(logic.updateBeatMultiplier).toHaveBeenCalledWith(2);
    expect(logic.startScheduler).not.toHaveBeenCalled();
    act(() => {
      jest.advanceTimersByTime(5);
    });
    expect(logic.startScheduler).toHaveBeenCalledTimes(1);
  });

  test('beat-mode-change while paused does not start the scheduler', () => {
    render(<AdvancedMetronomeWithCircle {...baseProps({ isPaused: true })} />);
    act(() => {
      window.dispatchEvent(new CustomEvent('beat-mode-change', { detail: { beatMultiplier: 2 } }));
      jest.advanceTimersByTime(50);
    });
    expect(logic.updateBeatMultiplier).toHaveBeenCalledWith(2);
    expect(logic.startScheduler).not.toHaveBeenCalled();
  });

  test('beat-mode-change tolerates logic without updateBeatMultiplier / startScheduler', () => {
    logic.updateBeatMultiplier = undefined;
    render(<AdvancedMetronomeWithCircle {...baseProps({ isPaused: false })} />);
    act(() => {
      window.dispatchEvent(new CustomEvent('beat-mode-change', { detail: { beatMultiplier: 2 } }));
    });
    expect(screen.getByTestId('beat-staff')).toHaveAttribute('data-eighth', 'true');

    logic.updateBeatMultiplier = jest.fn();
    logic.startScheduler = undefined;
    act(() => {
      window.dispatchEvent(new CustomEvent('beat-mode-change', { detail: { beatMultiplier: 1 } }));
      jest.advanceTimersByTime(10);
    });
    expect(logic.updateBeatMultiplier).toHaveBeenCalledWith(1);
  });

  test('the beatMultiplier prop overrides the current multiplier when it changes', () => {
    const props = baseProps();
    const { rerender } = render(<AdvancedMetronomeWithCircle {...props} beatMultiplier={1} />);
    rerender(<AdvancedMetronomeWithCircle {...props} beatMultiplier={2} />);
    expect(screen.getByTestId('beat-staff')).toHaveAttribute('data-eighth', 'true');
    expect(useMetronomeLogic.mock.calls.pop()[0].beatMultiplier).toBe(2);
  });
});

describe('tap tempo', () => {
  test('registers the logic tap handler on the prop, window.tapTempoRef and via event', () => {
    const registerTapTempo = jest.fn();
    const onRegister = jest.fn();
    window.addEventListener('register-tap-tempo', onRegister);
    render(<AdvancedMetronomeWithCircle {...baseProps()} registerTapTempo={registerTapTempo} />);
    window.removeEventListener('register-tap-tempo', onRegister);
    expect(registerTapTempo).toHaveBeenCalledWith(logic.tapTempo);
    expect(window.tapTempoRef.current).toBe(logic.tapTempo);
    expect(onRegister.mock.calls[0][0].detail.handler).toBe(logic.tapTempo);
  });

  test('does not require registerTapTempo and does not register without a tap handler', () => {
    logic.tapTempo = undefined;
    const onRegister = jest.fn();
    window.addEventListener('register-tap-tempo', onRegister);
    render(<AdvancedMetronomeWithCircle {...baseProps()} />);
    window.removeEventListener('register-tap-tempo', onRegister);
    expect(onRegister).not.toHaveBeenCalled();
    expect(window.tapTempoRef).toBeUndefined();
  });

  test('registers without a prop callback', () => {
    render(<AdvancedMetronomeWithCircle {...baseProps()} />);
    expect(window.tapTempoRef.current).toBe(logic.tapTempo);
  });

  test('unmount clears the global tap handler it installed', () => {
    const { unmount } = render(<AdvancedMetronomeWithCircle {...baseProps()} />);
    const ref = window.tapTempoRef;
    unmount();
    expect(ref.current).toBeNull();
  });

  test('unmount leaves a foreign tap handler alone', () => {
    const { unmount } = render(<AdvancedMetronomeWithCircle {...baseProps()} />);
    const foreign = jest.fn();
    window.tapTempoRef.current = foreign;
    unmount();
    expect(window.tapTempoRef.current).toBe(foreign);
  });

  test('clicking Tap Tempo calls the logic tap handler', () => {
    render(<AdvancedMetronomeWithCircle {...baseProps()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Tap Tempo' }));
    expect(logic.tapTempo).toHaveBeenCalledTimes(1);
  });

  test('falls back to window.tapTempoRef, then handleGlobalTapTempo, then an event', () => {
    logic.tapTempo = undefined;
    render(<AdvancedMetronomeWithCircle {...baseProps()} />);
    const button = screen.getByRole('button', { name: 'Tap Tempo' });

    window.tapTempoRef = { current: jest.fn() };
    fireEvent.click(button);
    expect(window.tapTempoRef.current).toHaveBeenCalledTimes(1);

    window.tapTempoRef = { current: null };
    window.handleGlobalTapTempo = jest.fn();
    fireEvent.click(button);
    expect(window.handleGlobalTapTempo).toHaveBeenCalledTimes(1);

    delete window.handleGlobalTapTempo;
    const onTap = jest.fn();
    window.addEventListener('metronome-tap-tempo', onTap);
    fireEvent.click(button);
    window.removeEventListener('metronome-tap-tempo', onTap);
    expect(onTap).toHaveBeenCalledTimes(1);
    expect(typeof onTap.mock.calls[0][0].detail.timestamp).toBe('number');
  });
});

describe('manual acceleration', () => {
  test('accelerate button only exists in speed modes 1 and 2 and calls manualTempoAcceleration while playing', () => {
    const props = baseProps({ isPaused: false });
    const { rerender } = render(<AdvancedMetronomeWithCircle {...props} speedMode={0} />);
    expect(screen.queryByRole('button', { name: /Accelerate tempo/ })).not.toBeInTheDocument();

    rerender(<AdvancedMetronomeWithCircle {...props} speedMode={2} tempoIncreasePercent={8} />);
    fireEvent.click(screen.getByRole('button', { name: /Accelerate tempo in Manual/ }));
    expect(manualTempoAcceleration).toHaveBeenCalledTimes(1);
    expect(manualTempoAcceleration).toHaveBeenCalledWith({
      tempoIncreasePercent: 8,
      tempoRef: { current: 100 },
      setTempo: props.setTempo
    });
  });

  test('accelerating while paused does nothing', () => {
    render(<AdvancedMetronomeWithCircle {...baseProps({ isPaused: true })} speedMode={1} />);
    fireEvent.click(screen.getByRole('button', { name: /Accelerate tempo in Auto/ }));
    expect(manualTempoAcceleration).not.toHaveBeenCalled();
  });
});

describe('debug hooks and sound reloads', () => {
  test('publishes audio context and buffers on window.metronomeDebug', () => {
    render(<AdvancedMetronomeWithCircle {...baseProps()} />);
    expect(window.metronomeDebug.audioContext).toBe(logic.audioCtx);
    expect(window.metronomeDebug.audioBuffers).toBe(logic.audioBuffers);
  });

  test('does not fail when window.metronomeDebug is missing', () => {
    delete window.metronomeDebug;
    expect(() => render(<AdvancedMetronomeWithCircle {...baseProps()} />)).not.toThrow();
  });

  test('does not publish when the logic has no buffers', () => {
    logic.audioBuffers = undefined;
    render(<AdvancedMetronomeWithCircle {...baseProps()} />);
    expect(window.metronomeDebug.audioContext).toBeNull();
  });

  test('soundSetReloadTrigger > 0 reloads sounds; 0 does not', async () => {
    const props = baseProps();
    const { rerender } = render(<AdvancedMetronomeWithCircle {...props} soundSetReloadTrigger={0} />);
    expect(logic.reloadSounds).not.toHaveBeenCalled();
    rerender(<AdvancedMetronomeWithCircle {...props} soundSetReloadTrigger={1} />);
    await flush();
    expect(logic.reloadSounds).toHaveBeenCalledTimes(1);
    expect(console.log).toHaveBeenCalledWith('Successfully reloaded sound buffers');
  });

  test('soundSetReloadTrigger reload failure and rejection are reported', async () => {
    const props = baseProps();
    logic.reloadSounds = jest.fn().mockResolvedValue(false);
    const { rerender } = render(<AdvancedMetronomeWithCircle {...props} soundSetReloadTrigger={0} />);
    rerender(<AdvancedMetronomeWithCircle {...props} soundSetReloadTrigger={1} />);
    await flush();
    expect(console.error).toHaveBeenCalledWith('Failed to reload sound buffers');

    logic.reloadSounds = jest.fn().mockRejectedValue(new Error('x'));
    rerender(<AdvancedMetronomeWithCircle {...props} soundSetReloadTrigger={2} />);
    await flush();
    expect(console.error).toHaveBeenCalledWith('Error reloading sounds:', expect.any(Error));
  });

  test('soundSetReloadTrigger is ignored without audio context or reloadSounds', async () => {
    const props = baseProps();
    logic.reloadSounds = undefined;
    expect(() => render(<AdvancedMetronomeWithCircle {...props} soundSetReloadTrigger={3} />)).not.toThrow();
  });
});

describe('sound previews', () => {
  const makeCtx = () => {
    const source = { connect: jest.fn(), start: jest.fn(), buffer: null };
    const gainNode = { connect: jest.fn(), gain: { value: 0 } };
    const ctx = {
      state: 'running',
      destination: { id: 'dest' },
      resume: jest.fn().mockResolvedValue(),
      createBufferSource: jest.fn(() => source),
      createGain: jest.fn(() => gainNode)
    };
    return { ctx, source, gainNode };
  };

  test.each([['first', 'F'], ['accent', 'A'], ['normal', 'N']])(
    'preview of %s plays the matching buffer at the requested volume',
    (type, buffer) => {
      const { ctx, source, gainNode } = makeCtx();
      logic.audioCtx = ctx;
      render(<AdvancedMetronomeWithCircle {...baseProps()} />);
      window.dispatchEvent(new CustomEvent('metronome-preview-sound', { detail: { type, volume: 0.3 } }));
      expect(source.buffer).toBe(buffer);
      expect(gainNode.gain.value).toBe(0.3);
      expect(source.connect).toHaveBeenCalledWith(gainNode);
      expect(gainNode.connect).toHaveBeenCalledWith(ctx.destination);
      expect(source.start).toHaveBeenCalledWith(0);
      expect(ctx.resume).not.toHaveBeenCalled();
    }
  );

  test('preview defaults the volume to 1 and resumes a suspended context', () => {
    const { ctx, gainNode } = makeCtx();
    ctx.state = 'suspended';
    logic.audioCtx = ctx;
    render(<AdvancedMetronomeWithCircle {...baseProps()} />);
    window.dispatchEvent(new CustomEvent('metronome-preview-sound', { detail: { type: 'normal' } }));
    expect(gainNode.gain.value).toBe(1);
    expect(ctx.resume).toHaveBeenCalledTimes(1);
  });

  test('preview ignores unknown types, missing buffers, missing context and missing buffer entry', () => {
    const { ctx } = makeCtx();
    logic.audioCtx = ctx;
    logic.audioBuffers = { first: 'F', normal: 'N', accent: null };
    const { rerender } = render(<AdvancedMetronomeWithCircle {...baseProps()} />);
    const fire = (type) =>
      window.dispatchEvent(new CustomEvent('metronome-preview-sound', { detail: { type, volume: 1 } }));
    fire('bogus');
    fire('accent');
    expect(ctx.createBufferSource).not.toHaveBeenCalled();

    logic = makeLogic({ audioCtx: null });
    rerender(<AdvancedMetronomeWithCircle {...baseProps()} tempo={101} />);
    fire('first');
    logic = makeLogic({ audioCtx: ctx, audioBuffers: null });
    rerender(<AdvancedMetronomeWithCircle {...baseProps()} tempo={102} />);
    fire('first');
    expect(ctx.createBufferSource).not.toHaveBeenCalled();
  });

  test('pattern preview schedules first, normal, normal, accent 500 ms apart', () => {
    const { ctx, source, gainNode } = makeCtx();
    ctx.state = 'suspended';
    logic.audioCtx = ctx;
    render(<AdvancedMetronomeWithCircle {...baseProps()} />);
    window.dispatchEvent(new CustomEvent('metronome-preview-pattern', { detail: { volume: 0.4 } }));
    expect(ctx.resume).toHaveBeenCalledTimes(1);
    const played = [];
    source.start.mockImplementation(() => played.push(source.buffer));
    act(() => {
      jest.advanceTimersByTime(0);
    });
    expect(played).toEqual(['F']);
    act(() => {
      jest.advanceTimersByTime(499);
    });
    expect(played).toEqual(['F']);
    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(played).toEqual(['F', 'N']);
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(played).toEqual(['F', 'N', 'N', 'A']);
    expect(gainNode.gain.value).toBe(0.4);
  });

  test('pattern preview defaults the volume to 1 and plays four clicks', () => {
    const { ctx, gainNode } = makeCtx();
    logic.audioCtx = ctx;
    render(<AdvancedMetronomeWithCircle {...baseProps()} />);
    window.dispatchEvent(new CustomEvent('metronome-preview-pattern', { detail: {} }));
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    expect(gainNode.gain.value).toBe(1);
    expect(ctx.createBufferSource).toHaveBeenCalledTimes(4);
  });

  test.each([
    ['no audio context', { audioCtx: null }],
    ['no buffers', { audioBuffers: null }],
    ['incomplete buffers', { audioBuffers: { first: 'F', normal: 'N' } }],
    ['missing first', { audioBuffers: { normal: 'N', accent: 'A' } }],
    ['missing normal', { audioBuffers: { first: 'F', accent: 'A' } }]
  ])('pattern preview does nothing with %s', (_name, patch) => {
    const { ctx } = makeCtx();
    logic = makeLogic({ audioCtx: ctx, ...patch });
    if (patch.audioCtx === null) logic.audioCtx = null;
    render(<AdvancedMetronomeWithCircle {...baseProps()} />);
    window.dispatchEvent(new CustomEvent('metronome-preview-pattern', { detail: { volume: 1 } }));
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    expect(ctx.createBufferSource).not.toHaveBeenCalled();
  });
});
