/* eslint-disable testing-library/no-container, testing-library/no-node-access, testing-library/render-result-naming-convention --
   These tests assert SVG/canvas geometry, CSS state classes and img sources that have no accessible role. */
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import GridModeMetronome from '../../../components/metronome/GridMode/GridModeMetronome';
import useMetronomeLogic from '../../../hooks/useMetronomeLogic';
import { playTapFeedback } from '../../../hooks/useMetronomeLogic/tapFeedback';

// The training HOC is covered elsewhere; here the grid itself is under test.
jest.mock('../../../components/Training/withTrainingContainer', () => (Component) => Component);
jest.mock('../../../hooks/useMetronomeLogic', () => jest.fn());
jest.mock('../../../hooks/useMetronomeLogic/tapFeedback', () => ({ playTapFeedback: jest.fn() }));

const mockViz = { size: { width: 360, height: 280 } };
jest.mock('../../../utils/layoutSize', () => ({
  useVizCardSize: () => [{ current: null }, mockViz.size]
}));

const originalInnerHeight = window.innerHeight;
let logic;
let frames;
let cancelled;
let nextFrame;

const makeAudioCtx = (state = 'running') => {
  const source = { connect: jest.fn(), start: jest.fn(), buffer: null };
  return {
    state,
    destination: { id: 'destination' },
    resume: jest.fn().mockResolvedValue(undefined),
    createBuffer: jest.fn().mockReturnValue({ id: 'silent' }),
    createBufferSource: jest.fn().mockReturnValue(source),
    source
  };
};

const makeLogic = (overrides = {}) => ({
  audioCtx: makeAudioCtx(),
  reloadSounds: jest.fn().mockResolvedValue(true),
  startScheduler: jest.fn(),
  stopScheduler: jest.fn(),
  tapTempo: jest.fn(),
  currentSubdivision: 0,
  ...overrides
});

const baseProps = (overrides = {}) => ({
  subdivisions: 4,
  accents: [3, 1, 1, 1],
  tempo: 120,
  setTempo: jest.fn(),
  volume: 0.7,
  swing: 0,
  isPaused: true,
  setIsPaused: jest.fn(),
  setSubdivisions: jest.fn(),
  updateAccents: jest.fn(),
  registerTogglePlay: jest.fn(),
  registerTapTempo: jest.fn(),
  ...overrides
});

const renderGrid = (overrides = {}) => {
  const props = baseProps(overrides);
  const utils = render(<GridModeMetronome {...props} />);
  return { props, ...utils };
};

const columns = () => screen.getAllByRole('button', { name: /^Beat \d/ });
const onCells = (column) => within(column).getAllByText('', { selector: '.grid-cell' }).filter((c) => c.classList.contains('is-on'));

const flushPromises = async () => {
  await act(async () => { await Promise.resolve(); await Promise.resolve(); });
};

const clickPlay = async (name) => {
  fireEvent.click(screen.getByRole('button', { name }));
  await flushPromises();
};

beforeEach(() => {
  jest.useFakeTimers();
  logic = makeLogic();
  useMetronomeLogic.mockImplementation(() => logic);
  mockViz.size = { width: 360, height: 280 };
  frames = [];
  cancelled = [];
  nextFrame = 1;
  jest.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
    const id = nextFrame;
    nextFrame += 1;
    frames.push([id, cb]);
    return id;
  });
  jest.spyOn(window, 'cancelAnimationFrame').mockImplementation((id) => {
    cancelled.push(id);
    frames = frames.filter(([fid]) => fid !== id);
  });
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(window, 'alert').mockImplementation(() => {});
  window.innerHeight = 900;
  delete window.handleGlobalPlayPauseGridMode;
});

afterEach(() => {
  act(() => { jest.runOnlyPendingTimers(); });
  jest.useRealTimers();
  jest.restoreAllMocks();
  jest.clearAllMocks();
  window.innerHeight = originalInnerHeight;
  delete window.handleGlobalPlayPauseGridMode;
});

describe('GridModeMetronome columns', () => {
  test('one button per beat, named by level, pressed for accents and first beats', () => {
    renderGrid({ subdivisions: 4, accents: [3, 1, 2, 0] });
    expect(columns().map((c) => c.getAttribute('aria-label'))).toEqual([
      'Beat 1: first beat. Activate to change accent.',
      'Beat 2: normal. Activate to change accent.',
      'Beat 3: accent. Activate to change accent.',
      'Beat 4: muted. Activate to change accent.'
    ]);
    expect(columns().map((c) => c.getAttribute('aria-pressed'))).toEqual(['true', 'false', 'true', 'false']);
  });

  test('the level fills cells from the bottom: first beat 3, accent 2, normal 1, muted 0', () => {
    renderGrid({ subdivisions: 4, accents: [3, 1, 2, 0] });
    expect(columns().map((c) => onCells(c).length)).toEqual([3, 1, 2, 0]);
    const cells = within(columns()[2]).getAllByText('', { selector: '.grid-cell' });
    expect(cells.map((c) => c.classList.contains('is-on'))).toEqual([false, true, true]);
  });

  test('beat numbers are shown but hidden from assistive tech, the first column is marked', () => {
    renderGrid({ subdivisions: 3, accents: [3, 1, 1] });
    expect(columns()[0]).toHaveClass('is-first');
    expect(columns()[1]).not.toHaveClass('is-first');
    expect(within(columns()[2]).getByText('3')).toHaveAttribute('aria-hidden', 'true');
    expect(columns()[0]).not.toHaveClass('is-muted');
  });

  test('muted columns get is-muted', () => {
    renderGrid({ subdivisions: 2, accents: [3, 0] });
    expect(columns()[1]).toHaveClass('is-muted');
  });

  test('cell sizes come from gridLayout and are applied in px', () => {
    renderGrid({ subdivisions: 4, accents: [3, 1, 1, 1] }); // 360 x 280
    const cell = within(columns()[0]).getAllByText('', { selector: '.grid-cell' })[0];
    expect(columns()[0]).toHaveStyle({ width: '82px' });
    expect(cell).toHaveStyle({ width: '82px', height: '76px' });
    expect(cell.style.getPropertyValue('--cell-min')).toBe('76px');
  });

  test('without a measured area nothing is drawn yet', () => {
    mockViz.size = { width: 0, height: 0 };
    renderGrid();
    expect(screen.queryAllByRole('button', { name: /^Beat \d/ })).toHaveLength(0);
  });

  test('a narrow area wraps the bar into two blocks in order', () => {
    mockViz.size = { width: 328, height: 240 };
    const { container } = renderGrid({ subdivisions: 9, accents: [3, 1, 1, 1, 1, 1, 1, 1, 1] });
    const blocks = [...container.querySelectorAll('.grid-columns')];
    expect(blocks).toHaveLength(2);
    expect(blocks.map((b) => b.children.length)).toEqual([5, 4]);
    expect(columns().map((c) => c.getAttribute('aria-label').slice(0, 6))).toEqual(
      Array.from({ length: 9 }, (_, i) => `Beat ${i + 1}`)
    );
  });

  test('the touch target is 40 px on short windows and 44 px on tall ones', () => {
    mockViz.size = { width: 242, height: 400 }; // inner width 210: 5 * 44 > 210 >= 5 * 40
    window.innerHeight = 900;
    const tall = renderGrid({ subdivisions: 5, accents: [3, 1, 1, 1, 1] });
    expect(tall.container.querySelectorAll('.grid-columns')).toHaveLength(2);
    tall.unmount();
    window.innerHeight = 700;
    const short = renderGrid({ subdivisions: 5, accents: [3, 1, 1, 1, 1] });
    expect(short.container.querySelectorAll('.grid-columns')).toHaveLength(1);
  });
});

describe('GridModeMetronome accent editing', () => {
  test('a click cycles the level 1 -> 2 and reports the new array', () => {
    const { props } = renderGrid({ subdivisions: 4, accents: [3, 1, 1, 1] });
    fireEvent.click(columns()[1]);
    expect(props.updateAccents).toHaveBeenCalledTimes(1);
    expect(props.updateAccents).toHaveBeenCalledWith([3, 2, 1, 1]);
    expect(columns()[1]).toHaveAttribute('aria-label', 'Beat 2: accent. Activate to change accent.');
  });

  test('levels wrap 3 -> 0 -> 1 on repeated clicks', () => {
    const { props } = renderGrid({ subdivisions: 2, accents: [3, 1] });
    fireEvent.click(columns()[0]);
    expect(props.updateAccents).toHaveBeenLastCalledWith([0, 1]);
    fireEvent.click(columns()[0]);
    expect(props.updateAccents).toHaveBeenLastCalledWith([1, 1]);
  });

  test('works without an updateAccents callback', () => {
    renderGrid({ subdivisions: 2, accents: [3, 1], updateAccents: undefined });
    fireEvent.click(columns()[1]);
    expect(columns()[1]).toHaveAttribute('aria-label', 'Beat 2: accent. Activate to change accent.');
  });

  test('accents of the wrong length fall back to first beat + normal beats', () => {
    renderGrid({ subdivisions: 3, accents: [0, 0] });
    expect(columns().map((c) => c.getAttribute('aria-label').split(': ')[1].split('.')[0])).toEqual(
      ['first beat', 'normal', 'normal']
    );
  });

  test('without accents the defaults are used', () => {
    renderGrid({ subdivisions: 3, accents: undefined });
    expect(columns().map((c) => onCells(c).length)).toEqual([3, 1, 1]);
  });

  test('new accents from the parent replace the local state', () => {
    const { props, rerender } = renderGrid({ subdivisions: 3, accents: [3, 1, 1] });
    rerender(<GridModeMetronome {...props} accents={[0, 2, 2]} />);
    expect(columns().map((c) => onCells(c).length)).toEqual([0, 2, 2]);
  });

  test('changing the number of beats resets the pattern and adds columns', () => {
    const { props, rerender } = renderGrid({ subdivisions: 3, accents: [0, 0, 0] });
    rerender(<GridModeMetronome {...props} subdivisions={5} accents={[0, 0, 0]} />);
    expect(columns()).toHaveLength(5);
    expect(columns().map((c) => onCells(c).length)).toEqual([3, 1, 1, 1, 1]);
  });
});

describe('GridModeMetronome logic wiring', () => {
  test('passes tempo, volume, grid mode and the pattern to the metronome logic', () => {
    const { props } = renderGrid({ beatMultiplier: 2, analogMode: false, macroMode: 1, speedMode: 2, swing: 0.2 });
    const args = useMetronomeLogic.mock.calls[0][0];
    expect(args).toMatchObject({
      tempo: 120, volume: 0.7, swing: 0.2, subdivisions: 4, isPaused: true, gridMode: true,
      beatMultiplier: 2, macroMode: 1, speedMode: 2, accents: props.accents
    });
    expect(args.setTempo).toBe(props.setTempo);
    expect(args.beatConfig).toEqual([3, 1, 1, 1]);
  });

  test('sounds are preloaded on mount, and a failure is logged without crashing', async () => {
    logic.reloadSounds = jest.fn().mockRejectedValue(new Error('offline'));
    renderGrid();
    await flushPromises();
    expect(logic.reloadSounds).toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledWith('Error preloading sounds:', expect.any(Error));
  });

  test('works when the logic has no reloadSounds', () => {
    logic = makeLogic({ reloadSounds: undefined });
    renderGrid();
    expect(columns()).toHaveLength(4);
  });

  test('a sound-set reload trigger reloads the sounds; no trigger or no audio context does not', async () => {
    const { props, rerender } = renderGrid();
    logic.reloadSounds.mockClear();
    rerender(<GridModeMetronome {...props} soundSetReloadTrigger={0} />);
    expect(logic.reloadSounds).not.toHaveBeenCalled();
    rerender(<GridModeMetronome {...props} soundSetReloadTrigger={1} />);
    await flushPromises();
    expect(logic.reloadSounds).toHaveBeenCalledTimes(1);
    expect(console.log).toHaveBeenCalledWith('Sounds reloaded successfully');
  });

  test('a failing reload on trigger is logged', async () => {
    const { props, rerender } = renderGrid();
    logic.reloadSounds = jest.fn().mockRejectedValue(new Error('x'));
    rerender(<GridModeMetronome {...props} soundSetReloadTrigger={2} />);
    await flushPromises();
    expect(console.error).toHaveBeenCalledWith('Error reloading sounds:', expect.any(Error));
  });

  test('no reload on trigger without an audio context', async () => {
    logic = makeLogic({ audioCtx: null });
    const { props, rerender } = renderGrid();
    logic.reloadSounds.mockClear();
    rerender(<GridModeMetronome {...props} soundSetReloadTrigger={3} />);
    await flushPromises();
    expect(logic.reloadSounds).not.toHaveBeenCalled();
  });
});

describe('GridModeMetronome play / pause', () => {
  test('the transport button reads Start while paused and Pause while playing', () => {
    const { props, rerender } = renderGrid({ isPaused: true });
    expect(screen.getByRole('button', { name: 'Start' })).toHaveAttribute('aria-pressed', 'false');
    rerender(<GridModeMetronome {...props} isPaused={false} />);
    expect(screen.getByRole('button', { name: 'Pause' })).toHaveAttribute('aria-pressed', 'true');
  });

  test('starting: reloads sounds, resumes a suspended context, unlocks with a silent buffer, starts', async () => {
    logic.audioCtx = makeAudioCtx('suspended');
    const { props } = renderGrid();
    logic.reloadSounds.mockClear();
    await clickPlay('Start');
    expect(logic.reloadSounds).toHaveBeenCalledTimes(1);
    expect(logic.audioCtx.resume).toHaveBeenCalledTimes(1);
    expect(props.setIsPaused).toHaveBeenCalledWith(false);
    expect(logic.audioCtx.createBuffer).toHaveBeenCalledWith(1, 1, 22050);
    expect(logic.audioCtx.source.buffer).toEqual({ id: 'silent' });
    expect(logic.audioCtx.source.connect).toHaveBeenCalledWith(logic.audioCtx.destination);
    expect(logic.audioCtx.source.start).toHaveBeenCalledWith(0);
    expect(logic.startScheduler).toHaveBeenCalledTimes(1);
    expect(logic.stopScheduler).not.toHaveBeenCalled();
  });

  test('a running context is not resumed', async () => {
    renderGrid();
    await clickPlay('Start');
    expect(logic.audioCtx.resume).not.toHaveBeenCalled();
    expect(logic.startScheduler).toHaveBeenCalledTimes(1);
  });

  test('warns after 100 ms when the context still is not running', async () => {
    logic.audioCtx = makeAudioCtx('suspended');
    renderGrid();
    await clickPlay('Start');
    expect(console.warn).toHaveBeenCalledWith('[GridMode] Audio context still not running, state: suspended');
    act(() => { jest.advanceTimersByTime(100); });
    expect(console.warn).toHaveBeenCalledWith('[GridMode] Audio context still not running after attempted start');
  });

  test('still starts when reloading the sounds fails', async () => {
    const { props } = renderGrid();
    logic.reloadSounds.mockRejectedValue(new Error('sound set missing'));
    await clickPlay('Start');
    expect(console.error).toHaveBeenCalledWith('[GridMode] Error reloading sounds:', expect.any(Error));
    expect(props.setIsPaused).toHaveBeenCalledWith(false);
    expect(logic.startScheduler).toHaveBeenCalledTimes(1);
  });

  test('still starts when resuming the context fails', async () => {
    logic.audioCtx = makeAudioCtx('suspended');
    logic.audioCtx.resume.mockRejectedValue(new Error('blocked'));
    const { props } = renderGrid();
    await clickPlay('Start');
    expect(props.setIsPaused).toHaveBeenCalledWith(false);
    expect(logic.startScheduler).toHaveBeenCalledTimes(1);
  });

  test('without any audio context it alerts and neither unpauses nor starts', async () => {
    logic.audioCtx = null;
    const { props } = renderGrid();
    await clickPlay('Start');
    expect(window.alert).toHaveBeenCalledWith(
      'Unable to start audio system. Please try clicking the play button again or refresh the page.'
    );
    expect(props.setIsPaused).not.toHaveBeenCalled();
    expect(logic.startScheduler).not.toHaveBeenCalled();
  });

  test('a failing silent unlock sound does not prevent the start', async () => {
    logic.audioCtx.createBuffer.mockImplementation(() => { throw new Error('no buffer'); });
    renderGrid();
    await clickPlay('Start');
    expect(console.warn).toHaveBeenCalledWith('[GridMode] Failed to play silent sound:', expect.any(Error));
    expect(logic.startScheduler).toHaveBeenCalledTimes(1);
  });

  test('a failing scheduler start is retried once, then the UI returns to paused', async () => {
    logic.startScheduler.mockImplementation(() => { throw new Error('boom'); });
    const { props } = renderGrid();
    await clickPlay('Start');
    expect(logic.startScheduler).toHaveBeenCalledTimes(2);
    expect(props.setIsPaused.mock.calls.map((c) => c[0])).toEqual([false, false, true]);
    expect(console.error).toHaveBeenCalledWith('[GridMode] Failed to start after error:', expect.any(Error));
  });

  test('a scheduler that fails only once ends up running', async () => {
    logic.startScheduler.mockImplementationOnce(() => { throw new Error('first time'); });
    const { props } = renderGrid();
    await clickPlay('Start');
    expect(logic.startScheduler).toHaveBeenCalledTimes(2);
    expect(props.setIsPaused.mock.calls.map((c) => c[0])).toEqual([false, false]);
  });

  test('pausing stops the scheduler and pauses the UI', async () => {
    const { props } = renderGrid({ isPaused: false });
    await clickPlay('Pause');
    expect(props.setIsPaused).toHaveBeenCalledWith(true);
    expect(logic.stopScheduler).toHaveBeenCalledTimes(1);
    expect(logic.startScheduler).not.toHaveBeenCalled();
  });
});

describe('GridModeMetronome registration and global events', () => {
  test('registers the toggle and tap-tempo handlers and unregisters them on unmount', () => {
    const { props, unmount } = renderGrid();
    expect(props.registerTogglePlay).toHaveBeenCalledWith(expect.any(Function));
    expect(props.registerTapTempo).toHaveBeenCalledWith(logic.tapTempo);
    unmount();
    expect(props.registerTogglePlay).toHaveBeenLastCalledWith(null);
    expect(props.registerTapTempo).toHaveBeenLastCalledWith(null);
  });

  test('registers null as tap handler when the logic has none', () => {
    logic = makeLogic({ tapTempo: undefined });
    const { props } = renderGrid();
    expect(props.registerTapTempo).toHaveBeenCalledWith(null);
    expect(console.warn).toHaveBeenCalledWith('[GridMode] tapTempo function is not available');
  });

  test('works without register callbacks', () => {
    const { unmount } = renderGrid({ registerTogglePlay: undefined, registerTapTempo: undefined });
    expect(columns()).toHaveLength(4);
    unmount();
  });

  test('the registered toggle handler starts playback', async () => {
    const { props } = renderGrid();
    await act(async () => { await props.registerTogglePlay.mock.calls[0][0](); });
    expect(logic.startScheduler).toHaveBeenCalledTimes(1);
  });

  test('the global metronome-toggle-play event toggles playback', async () => {
    renderGrid();
    await act(async () => {
      window.dispatchEvent(new Event('metronome-toggle-play'));
      await Promise.resolve();
    });
    await flushPromises();
    expect(logic.startScheduler).toHaveBeenCalledTimes(1);
  });

  test('an error escaping the play handler is caught and logged by the global listener', async () => {
    renderGrid({ setIsPaused: jest.fn(() => { throw new Error('state setter broke'); }) });
    await act(async () => {
      window.dispatchEvent(new Event('metronome-toggle-play'));
      await Promise.resolve();
    });
    await flushPromises();
    expect(console.error).toHaveBeenCalledWith('[GridMode] Error in global play/pause handler:', expect.any(Error));
  });

  test('the event listener and the global backup handler are removed on unmount', async () => {
    const { unmount } = renderGrid();
    expect(typeof window.handleGlobalPlayPauseGridMode).toBe('function');
    unmount();
    expect(window.handleGlobalPlayPauseGridMode).toBeNull();
    window.dispatchEvent(new Event('metronome-toggle-play'));
    await flushPromises();
    expect(logic.startScheduler).not.toHaveBeenCalled();
  });

  test('an existing global backup handler is not overwritten', () => {
    const existing = jest.fn();
    window.handleGlobalPlayPauseGridMode = existing;
    const { unmount } = renderGrid();
    expect(window.handleGlobalPlayPauseGridMode).toBe(existing);
    unmount();
    expect(window.handleGlobalPlayPauseGridMode).toBe(existing);
  });
});

describe('GridModeMetronome tap tempo button', () => {
  test('calls the logic tap handler and plays the feedback click at the volume', () => {
    renderGrid({ volume: 0.3 });
    fireEvent.click(screen.getByRole('button', { name: 'Tap Tempo' }));
    expect(logic.tapTempo).toHaveBeenCalledTimes(1);
    expect(playTapFeedback).toHaveBeenCalledWith(0.3);
  });

  test('warns when the logic offers no tap handler', () => {
    logic = makeLogic({ tapTempo: undefined });
    renderGrid();
    fireEvent.click(screen.getByRole('button', { name: 'Tap Tempo' }));
    expect(console.warn).toHaveBeenCalledWith('[GRID MODE] tapTempo function is not available');
  });
});

describe('GridModeMetronome accelerate button', () => {
  test('is hidden without speed training', () => {
    renderGrid({ speedMode: 0 });
    expect(screen.queryByRole('button', { name: /Accelerate tempo/ })).toBeNull();
  });

  test('while playing a click raises the tempo by 5 % (rounded), at most 10 BPM', () => {
    const { props } = renderGrid({ speedMode: 1, isPaused: false, tempo: 120, tempoIncreasePercent: 5 });
    fireEvent.click(screen.getByRole('button', { name: /Accelerate tempo in Auto/ }));
    expect(props.setTempo).toHaveBeenCalledWith(126);
  });

  test('the +10 BPM cap and the 180 BPM ceiling apply', () => {
    const fast = renderGrid({ speedMode: 2, isPaused: false, tempo: 170, tempoIncreasePercent: 50 });
    fireEvent.click(screen.getByRole('button', { name: /Accelerate tempo in Manual/ }));
    expect(fast.props.setTempo).toHaveBeenCalledWith(180);
  });

  test('a click while paused does nothing', () => {
    const { props } = renderGrid({ speedMode: 2, isPaused: true });
    fireEvent.click(screen.getByRole('button', { name: /Accelerate tempo/ }));
    expect(props.setTempo).not.toHaveBeenCalled();
  });
});

describe('GridModeMetronome beat animation', () => {
  const runFrame = () => {
    const [id, cb] = frames.shift();
    act(() => { cb(0); });
    return id;
  };

  test('while paused no column is current and the root is not active', () => {
    logic.currentSubdivision = 2;
    const { container } = renderGrid({ isPaused: true });
    expect(container.querySelectorAll('.is-current')).toHaveLength(0);
    expect(container.firstChild).not.toHaveClass('metronome-active');
    expect(frames).toHaveLength(0);
  });

  test('while playing the current subdivision is highlighted and the root is active', () => {
    logic.currentSubdivision = 2;
    const { container } = renderGrid({ isPaused: false });
    expect(columns()[2]).toHaveClass('is-current');
    expect(container.querySelectorAll('.is-current')).toHaveLength(1);
    expect(container.firstChild).toHaveClass('metronome-active');
    expect(container.firstChild).not.toHaveClass('first-beat-playing');
  });

  test('beat 0 marks the root with first-beat-playing', () => {
    logic.currentSubdivision = 0;
    const { container } = renderGrid({ isPaused: false });
    expect(columns()[0]).toHaveClass('is-current');
    expect(container.firstChild).toHaveClass('first-beat-playing');
  });

  test('the highlight follows the logic when the beat advances', () => {
    const { props, rerender } = renderGrid({ isPaused: false });
    expect(columns()[0]).toHaveClass('is-current');
    logic.currentSubdivision = 1;
    rerender(<GridModeMetronome {...props} isPaused={false} />);
    expect(columns()[1]).toHaveClass('is-current');
    expect(columns()[0]).not.toHaveClass('is-current');
  });

  test('each frame schedules the next one', () => {
    renderGrid({ isPaused: false });
    const before = frames.length;
    expect(before).toBeGreaterThan(0);
    runFrame();
    expect(frames).toHaveLength(before);
  });

  test('pausing cancels the pending frame and clears the highlight', () => {
    const { props, container, rerender } = renderGrid({ isPaused: false });
    const pending = frames.map(([id]) => id);
    rerender(<GridModeMetronome {...props} isPaused />);
    expect(pending.every((id) => cancelled.includes(id))).toBe(true);
    expect(container.querySelectorAll('.is-current')).toHaveLength(0);
    expect(container.firstChild).not.toHaveClass('metronome-active');
  });

  test('unmount cancels the animation frame', () => {
    const { unmount } = renderGrid({ isPaused: false });
    const pending = frames.map(([id]) => id);
    unmount();
    expect(pending.every((id) => cancelled.includes(id))).toBe(true);
  });
});
