/* eslint-disable testing-library/no-container, testing-library/no-node-access, testing-library/render-result-naming-convention --
   These tests assert SVG/canvas geometry, CSS state classes and img sources that have no accessible role. */
import { act, fireEvent, render, screen } from '@testing-library/react';
import BaseMetronomeLayout from '../../../components/metronome/BaseMetronomeLayout';

const originalSize = { w: window.innerWidth, h: window.innerHeight };
const originalMatchMedia = window.matchMedia;

const setWindow = (w, h) => {
  window.innerWidth = w;
  window.innerHeight = h;
};

const renderLayout = (props = {}) => {
  const handlers = {
    setTempo: jest.fn(), setVolume: jest.fn(), setSwing: jest.fn(),
    onTogglePlay: jest.fn(), onTapTempo: jest.fn()
  };
  const utils = render(
    <BaseMetronomeLayout tempo={120} volume={0.5} swing={0.1} isPaused {...handlers} {...props}>
      <div data-testid="child" />
    </BaseMetronomeLayout>
  );
  return { ...handlers, ...utils };
};

const container = () => screen.getByTestId('child').parentElement;

beforeEach(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
  window.matchMedia = undefined;
});

afterEach(() => {
  setWindow(originalSize.w, originalSize.h);
  window.matchMedia = originalMatchMedia;
  jest.restoreAllMocks();
});

describe('BaseMetronomeLayout container size', () => {
  test('phone (< 600 px wide): min(w - 40, 320, max(200, 0.34 h))', () => {
    setWindow(400, 800);
    renderLayout();
    expect(container()).toHaveStyle({ width: '272px', height: '272px' });
  });

  test('phone: never below 200 px from the height term, never above 320', () => {
    setWindow(500, 400); // 0.34 * 400 = 136 -> max(200, 136) = 200
    renderLayout();
    expect(container()).toHaveStyle({ width: '200px' });
    act(() => { setWindow(580, 2000); window.dispatchEvent(new Event('resize')); });
    expect(container()).toHaveStyle({ width: '320px' });
  });

  test('tablet (600..1180 px): min(w - 72, 0.48 h, 500)', () => {
    setWindow(800, 800);
    renderLayout();
    expect(container()).toHaveStyle({ width: '384px', height: '384px' });
  });

  test('a coarse pointer on a wide screen uses the tablet formula', () => {
    window.matchMedia = jest.fn().mockReturnValue({ matches: true });
    setWindow(1400, 900);
    renderLayout();
    expect(window.matchMedia).toHaveBeenCalledWith('(pointer: coarse)');
    expect(container()).toHaveStyle({ width: '432px' }); // min(1328, 432, 500)
  });

  test('desktop (> 1180 px, fine pointer): min(0.34 w, 0.48 h, 440)', () => {
    window.matchMedia = jest.fn().mockReturnValue({ matches: false });
    setWindow(1400, 1200);
    renderLayout();
    expect(container()).toHaveStyle({ width: '440px' }); // min(476, 576, 440)
  });

  test('a resize re-measures and the listener is removed on unmount', () => {
    setWindow(1400, 1200);
    const { unmount } = renderLayout();
    expect(container()).toHaveStyle({ width: '440px' });
    act(() => { setWindow(1300, 600); window.dispatchEvent(new Event('resize')); });
    expect(container()).toHaveStyle({ width: '288px' }); // 0.48 * 600
    const remove = jest.spyOn(window, 'removeEventListener');
    unmount();
    expect(remove).toHaveBeenCalledWith('resize', expect.any(Function));
  });
});

describe('BaseMetronomeLayout children and controls', () => {
  test('a function child receives the container size', () => {
    setWindow(800, 800);
    const child = jest.fn(() => <div data-testid="fn-child" />);
    render(
      <BaseMetronomeLayout tempo={120} volume={0.5} swing={0} isPaused setTempo={() => {}} setVolume={() => {}} setSwing={() => {}}>
        {child}
      </BaseMetronomeLayout>
    );
    expect(child).toHaveBeenCalledWith(384);
    expect(screen.getByTestId('fn-child')).toBeInTheDocument();
  });

  test('play button toggles and its icon follows the paused state', () => {
    const { onTogglePlay, rerender } = renderLayout({ isPaused: true });
    const img = screen.getByAltText('Toggle Play');
    expect(img.getAttribute('src')).toContain('play.svg');
    fireEvent.click(img.closest('button'));
    expect(onTogglePlay).toHaveBeenCalledTimes(1);
    rerender(
      <BaseMetronomeLayout tempo={120} volume={0.5} swing={0.1} isPaused={false} setTempo={() => {}} setVolume={() => {}} setSwing={() => {}} onTogglePlay={onTogglePlay}>
        <div data-testid="child" />
      </BaseMetronomeLayout>
    );
    expect(screen.getByAltText('Toggle Play').getAttribute('src')).toContain('pause.svg');
  });

  test('sliders show the values and report numbers', () => {
    const h = renderLayout({ tempo: 90, volume: 0.25, swing: 0.2 });
    expect(screen.getByText(/Tempo: 90 BPM/)).toBeInTheDocument();
    expect(screen.getByText(/Volume: 25%/)).toBeInTheDocument();
    expect(screen.getByText(/Swing: 40%/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Tempo:/), { target: { value: '150' } });
    expect(h.setTempo).toHaveBeenCalledWith(150);
    fireEvent.change(screen.getByLabelText(/Volume:/), { target: { value: '0.75' } });
    expect(h.setVolume).toHaveBeenCalledWith(0.75);
    fireEvent.change(screen.getByLabelText(/Swing:/), { target: { value: '0.3' } });
    expect(h.setSwing).toHaveBeenCalledWith(0.3);
  });

  test('the swing slider can be hidden', () => {
    renderLayout({ showSwingSlider: false });
    expect(screen.queryByLabelText(/Swing:/)).toBeNull();
  });
});

describe('BaseMetronomeLayout tap tempo', () => {
  const tapButton = () => screen.getByAltText('Tap Tempo').closest('button');
  let events;
  let listener;

  beforeEach(() => {
    events = [];
    listener = (e) => events.push(e.detail);
    window.addEventListener('metronome-tap-tempo', listener);
  });

  afterEach(() => window.removeEventListener('metronome-tap-tempo', listener));

  test('prefers logic.tapTempo over the callback and reports handled', () => {
    const tapTempo = jest.fn();
    const h = renderLayout({ logic: { tapTempo } });
    fireEvent.click(tapButton());
    expect(tapTempo).toHaveBeenCalledTimes(1);
    expect(h.onTapTempo).not.toHaveBeenCalled();
    expect(events).toHaveLength(1);
    expect(events[0].handled).toBe(true);
    expect(typeof events[0].timestamp).toBe('number');
  });

  test('falls back to onTapTempo when the logic has no tapTempo function', () => {
    const h = renderLayout({ logic: { tapTempo: 'nope' } });
    fireEvent.click(tapButton());
    expect(h.onTapTempo).toHaveBeenCalledTimes(1);
    expect(events[0].handled).toBe(true);
  });

  test('without logic or callback it still broadcasts, marked unhandled', () => {
    renderLayout({ onTapTempo: undefined });
    fireEvent.click(tapButton());
    expect(events).toHaveLength(1);
    expect(events[0].handled).toBe(false);
  });
});
