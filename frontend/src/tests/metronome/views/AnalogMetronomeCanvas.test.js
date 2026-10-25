/* eslint-disable testing-library/no-container, testing-library/no-node-access, testing-library/render-result-naming-convention --
   These tests assert SVG/canvas geometry, CSS state classes and img sources that have no accessible role. */
import { render } from '@testing-library/react';
import AnalogMetronomeCanvas from '../../../components/metronome/AnalogMode/AnalogMetronomeCanvas';

const MAX = Math.PI / 4;

// A recording 2D context: every drawing call is logged together with the
// style state that was current when it happened.
const createRecordingContext = () => {
  const log = [];
  const ctx = { fillStyle: '', strokeStyle: '', lineWidth: 1, lineCap: 'butt', font: '', textBaseline: '' };
  ['save', 'restore', 'beginPath', 'moveTo', 'lineTo', 'arc', 'ellipse', 'translate', 'rotate',
    'setTransform', 'clearRect', 'fillRect', 'fillText', 'fill', 'stroke'].forEach((op) => {
    ctx[op] = (...args) => {
      log.push({ op, args, fillStyle: ctx.fillStyle, strokeStyle: ctx.strokeStyle, lineWidth: ctx.lineWidth, font: ctx.font });
    };
  });
  ctx.measureText = (text) => ({ width: text.length * 8 });
  return { ctx, log };
};

let rec;
let now;
let frames;
let nextId;
let cancelled;
let getContextSpy;

const stepFrame = (advanceMs = 0) => {
  now += advanceMs;
  const [id, cb] = frames.shift();
  rec.log.length = 0;
  cb(now);
  return id;
};

beforeEach(() => {
  rec = createRecordingContext();
  now = 1000;
  frames = [];
  nextId = 1;
  cancelled = [];
  getContextSpy = jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => rec.ctx);
  jest.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
    const id = nextId;
    nextId += 1;
    frames.push([id, cb]);
    return id;
  });
  jest.spyOn(window, 'cancelAnimationFrame').mockImplementation((id) => {
    cancelled.push(id);
    const i = frames.findIndex(([fid]) => fid === id);
    if (i >= 0) frames.splice(i, 1);
  });
  jest.spyOn(performance, 'now').mockImplementation(() => now);
  window.devicePixelRatio = 1;
});

afterEach(() => {
  jest.restoreAllMocks();
  delete window.devicePixelRatio;
});

const rotations = (log) => {
  // the pendulum rotation is the first rotate after the translate to the pivot
  const pivotIdx = log.findIndex((e) => e.op === 'translate' && e.args[0] === 200 && e.args[1] === 274.75);
  expect(pivotIdx).toBeGreaterThanOrEqual(0);
  const rest = log.slice(pivotIdx + 1).filter((e) => e.op === 'rotate');
  return [rest[0].args[0], rest[1].args[0]];
};

const props = { width: 400, height: 300, tempo: 120, isPaused: true };

describe('AnalogMetronomeCanvas element', () => {
  test('is a hidden, absolutely positioned canvas sized by the CSS size times the pixel ratio', () => {
    window.devicePixelRatio = 2;
    const { container } = render(<AnalogMetronomeCanvas {...props} />);
    const canvas = container.querySelector('canvas');
    expect(canvas).toHaveAttribute('aria-hidden', 'true');
    expect(canvas).toHaveAttribute('width', '800');
    expect(canvas).toHaveAttribute('height', '600');
    expect(canvas).toHaveStyle({ position: 'absolute', top: '0px', left: '0px', width: '400px', height: '300px' });
    expect(getContextSpy).toHaveBeenCalledWith('2d');
  });

  test('the pixel ratio is capped at 3 and defaults to 1', () => {
    window.devicePixelRatio = 5;
    const capped = render(<AnalogMetronomeCanvas {...props} />).container.querySelector('canvas');
    expect(capped).toHaveAttribute('width', '1200');
    window.devicePixelRatio = 0;
    const dflt = render(<AnalogMetronomeCanvas {...props} width={101} />).container.querySelector('canvas');
    expect(dflt).toHaveAttribute('width', '101');
  });

  test('draws nothing until the first animation frame', () => {
    render(<AnalogMetronomeCanvas {...props} />);
    expect(rec.log).toHaveLength(0);
    expect(frames).toHaveLength(1);
  });
});

describe('AnalogMetronomeCanvas paused frame', () => {
  test('resets the transform, clears the area and re-schedules itself', () => {
    window.devicePixelRatio = 2;
    render(<AnalogMetronomeCanvas {...props} />);
    stepFrame();
    expect(rec.log[0].op).toBe('save');
    expect(rec.log[1]).toMatchObject({ op: 'setTransform', args: [2, 0, 0, 2, 0, 0] });
    expect(rec.log[2]).toMatchObject({ op: 'clearRect', args: [0, 0, 400, 300] });
    expect(rec.log[rec.log.length - 1].op).toBe('restore');
    expect(frames).toHaveLength(1);
  });

  test('the pendulum rests at angle 0 and the pivot sits at the computed position', () => {
    render(<AnalogMetronomeCanvas {...props} />);
    stepFrame();
    expect(rotations(rec.log)).toEqual([0, -0]);
  });

  test('draws the five staff lines between margin 16 and width - 16', () => {
    render(<AnalogMetronomeCanvas {...props} />);
    stepFrame();
    const lines = rec.log.filter((e) => e.op === 'moveTo' && e.args[0] === 16);
    expect(lines.map((e) => e.args[1])).toEqual([144.5, 159.5, 174.5, 189.5, 204.5]);
    const lineTo = rec.log.filter((e) => e.op === 'lineTo' && e.args[0] === 384);
    expect(lineTo.map((e) => e.args[1])).toEqual([144.5, 159.5, 174.5, 189.5, 204.5]);
  });

  test('draws two bar lines and the final thick bar', () => {
    render(<AnalogMetronomeCanvas {...props} />);
    stepFrame();
    const bars = rec.log.filter((e) => e.op === 'moveTo' && (e.args[0] === 16.5 || e.args[0] === 376.5));
    expect(bars.map((e) => e.args)).toEqual([[16.5, 144], [376.5, 144]]);
    const final = rec.log.find((e) => e.op === 'fillRect');
    expect(final.args).toEqual([381, 144, 3, 61]);
  });

  test('writes the tempo word and "= tempo" at the top left', () => {
    render(<AnalogMetronomeCanvas {...props} />);
    stepFrame();
    const texts = rec.log.filter((e) => e.op === 'fillText');
    expect(texts[0].args).toEqual(['Allegro', 16, 14]);
    expect(texts[0].font).toBe('700 13px Lato, sans-serif');
    // x = left (16) + measured width of "Allegro" (7 * 8) + 8 + 14
    expect(texts[1].args).toEqual(['= 120', 16 + 56 + 8 + 14, 14]);
    expect(texts[1].font).toBe('400 13px Lato, sans-serif');
    expect(texts[1].fillStyle).toBe('#5a6672');
  });

  test('the tempo word follows the tempo', () => {
    render(<AnalogMetronomeCanvas {...props} tempo={50} />);
    stepFrame();
    expect(rec.log.find((e) => e.op === 'fillText').args[0]).toBe('Largo');
  });

  test('draws 12 grey ticks plus one blue centre tick', () => {
    render(<AnalogMetronomeCanvas {...props} />);
    stepFrame();
    const strokes = rec.log.filter((e) => e.op === 'stroke');
    expect(strokes.filter((e) => e.strokeStyle === '#0072b2')).toHaveLength(1);
    expect(strokes.filter((e) => e.strokeStyle === '#0072b2')[0].lineWidth).toBe(1.5);
    expect(strokes.filter((e) => e.strokeStyle === '#768593')).toHaveLength(12);
  });

  test('scale arc: radius is rod + weight + 10, spanning 112.5 % of the swing', () => {
    render(<AnalogMetronomeCanvas {...props} />);
    stepFrame();
    // armLength 201, weightR 10.5 -> r1 = 221.5
    const arc = rec.log.find((e) => e.op === 'arc' && e.args[0] === 0 && e.args[1] === 0 && e.args[2] === 221.5);
    expect(arc.args[3]).toBeCloseTo(-Math.PI / 2 - MAX * 1.125, 10);
    expect(arc.args[4]).toBeCloseTo(-Math.PI / 2 + MAX * 1.125, 10);
  });

  test('rod of 201 px and a hollow ring weight at 78 % of the rod while paused', () => {
    render(<AnalogMetronomeCanvas {...props} />);
    stepFrame();
    expect(rec.log.some((e) => e.op === 'lineTo' && e.args[0] === 0 && e.args[1] === -201)).toBe(true);
    const idx = rec.log.findIndex((e) => e.op === 'arc' && e.args[1] === -201 * 0.78);
    const [cx, cy, radius, from, to] = rec.log[idx].args;
    expect([cx, cy, from, to]).toEqual([0, -156.78, 0, Math.PI * 2]);
    expect(radius).toBeCloseTo(10.5, 10);
    const fill = rec.log.slice(idx).find((e) => e.op === 'fill');
    expect(fill.fillStyle).toBe('#ffffff'); // background colour: hollow
    const stroke = rec.log.slice(idx).find((e) => e.op === 'stroke');
    expect(stroke.strokeStyle).toBe('#111111');
  });

  test('the hub is a dark 4 px disc', () => {
    render(<AnalogMetronomeCanvas {...props} />);
    stepFrame();
    const hub = rec.log.map((e, i) => ({ ...e, i })).filter((e) => e.op === 'arc' && e.args[2] === 4)[0];
    expect(hub).toBeDefined();
    expect(hub.args).toEqual([0, 0, 4, 0, Math.PI * 2]);
    const fill = rec.log.slice(hub.i).find((e) => e.op === 'fill');
    expect(fill.fillStyle).toBe('#111111');
  });
});

describe('AnalogMetronomeCanvas swinging frame', () => {
  test('the weight is a filled blue disc without an outline', () => {
    render(<AnalogMetronomeCanvas {...props} isPaused={false} />);
    stepFrame();
    const idx = rec.log.findIndex((e) => e.op === 'arc' && e.args[1] === -201 * 0.78);
    const fill = rec.log.slice(idx).find((e) => e.op === 'fill');
    expect(fill.fillStyle).toBe('#0072b2');
    const nextOps = rec.log.slice(idx + 1, idx + 3).map((e) => e.op);
    expect(nextOps).toEqual(['fill', 'rotate']);
  });

  test('first frame starts at the left extreme and is smoothed by 0.3', () => {
    render(<AnalogMetronomeCanvas {...props} isPaused={false} />);
    stepFrame();
    const [angle, back] = rotations(rec.log);
    expect(angle).toBeCloseTo(-MAX * 0.3, 10);
    expect(back).toBeCloseTo(MAX * 0.3, 10);
  });

  test('half a period later (one beat at 120 BPM = 500 ms) the target is the right extreme', () => {
    render(<AnalogMetronomeCanvas {...props} isPaused={false} />);
    stepFrame();
    const a1 = -MAX * 0.3;
    stepFrame(500);
    const a2 = a1 + (MAX - a1) * 0.3;
    expect(rotations(rec.log)[0]).toBeCloseTo(a2, 10);
  });

  test('a full period (1000 ms) is back at the left extreme target', () => {
    render(<AnalogMetronomeCanvas {...props} isPaused={false} />);
    stepFrame();
    const a1 = -MAX * 0.3;
    stepFrame(1000);
    expect(rotations(rec.log)[0]).toBeCloseTo(a1 + (-MAX - a1) * 0.3, 10);
  });

  test('a quarter period targets the centre (angle 0)', () => {
    render(<AnalogMetronomeCanvas {...props} isPaused={false} />);
    stepFrame();
    const a1 = -MAX * 0.3;
    stepFrame(250);
    expect(rotations(rec.log)[0]).toBeCloseTo(a1 + (0 - a1) * 0.3, 10);
  });

  test('beatMultiplier 2 halves the beat interval', () => {
    render(<AnalogMetronomeCanvas {...props} isPaused={false} beatMultiplier={2} />);
    stepFrame();
    const a1 = -MAX * 0.3;
    stepFrame(250); // one eighth-note beat = half a period
    expect(rotations(rec.log)[0]).toBeCloseTo(a1 + (MAX - a1) * 0.3, 10);
  });

  test('a faster tempo shortens the period', () => {
    render(<AnalogMetronomeCanvas {...props} isPaused={false} tempo={240} />);
    stepFrame();
    const a1 = -MAX * 0.3;
    stepFrame(250); // beat = 250 ms at 240 BPM
    expect(rotations(rec.log)[0]).toBeCloseTo(a1 + (MAX - a1) * 0.3, 10);
  });

  test('the angle converges on the target when frames repeat at the same instant', () => {
    render(<AnalogMetronomeCanvas {...props} isPaused={false} />);
    let angle = 0;
    for (let i = 0; i < 40; i += 1) {
      stepFrame(0);
      [angle] = rotations(rec.log);
    }
    expect(angle).toBeCloseTo(-MAX, 4);
  });
});

describe('AnalogMetronomeCanvas lifecycle', () => {
  test('each frame schedules the next; unmount cancels the pending frame', () => {
    const { unmount } = render(<AnalogMetronomeCanvas {...props} />);
    const first = stepFrame();
    expect(frames).toHaveLength(1);
    expect(frames[0][0]).not.toBe(first);
    const pending = frames[0][0];
    unmount();
    expect(cancelled).toContain(pending);
    expect(frames).toHaveLength(0);
  });

  test('pausing resets to angle 0 on the next frame', () => {
    const { rerender } = render(<AnalogMetronomeCanvas {...props} isPaused={false} />);
    stepFrame();
    stepFrame(100);
    rerender(<AnalogMetronomeCanvas {...props} isPaused />);
    stepFrame();
    expect(rotations(rec.log)).toEqual([0, -0]);
  });

  test('restarting after a pause starts the swing from the left extreme again', () => {
    const { rerender } = render(<AnalogMetronomeCanvas {...props} isPaused={false} />);
    stepFrame();
    stepFrame(500);
    rerender(<AnalogMetronomeCanvas {...props} isPaused />);
    stepFrame();
    now += 12345;
    rerender(<AnalogMetronomeCanvas {...props} isPaused={false} />);
    stepFrame();
    expect(rotations(rec.log)[0]).toBeCloseTo(-MAX * 0.3, 10);
  });

  test('a size change re-lays-out: wider plates move the right bar line', () => {
    const { rerender } = render(<AnalogMetronomeCanvas {...props} />);
    rerender(<AnalogMetronomeCanvas {...props} width={800} />);
    stepFrame();
    // margin = round(clamp(24, 16, 28)) = 24, right bar at 800 - 24 - 7.5
    expect(rec.log.some((e) => e.op === 'moveTo' && e.args[0] === 768.5)).toBe(true);
    expect(rec.log.find((e) => e.op === 'clearRect').args).toEqual([0, 0, 800, 300]);
  });

  test('tiny plates keep the minimum rod length of 60 px', () => {
    render(<AnalogMetronomeCanvas width={120} height={90} tempo={120} isPaused />);
    stepFrame();
    expect(rec.log.some((e) => e.op === 'lineTo' && e.args[0] === 0 && e.args[1] === -60)).toBe(true);
  });
});

describe('AnalogMetronomeCanvas design tokens', () => {
  test('colours are read from the canvas computed style, trimmed, with fallbacks for the rest', () => {
    jest.spyOn(window, 'getComputedStyle').mockImplementation(() => ({
      getPropertyValue: (name) => ({ '--accent': '  #ff0000 ', '--font': ' Inter ' }[name] || '')
    }));
    render(<AnalogMetronomeCanvas {...props} isPaused={false} />);
    stepFrame();
    const text = rec.log.find((e) => e.op === 'fillText');
    expect(text.font).toBe('700 13px Inter');
    const idx = rec.log.findIndex((e) => e.op === 'arc' && e.args[1] === -201 * 0.78);
    expect(rec.log.slice(idx).find((e) => e.op === 'fill').fillStyle).toBe('#ff0000');
    expect(rec.log.find((e) => e.op === 'fillRect').fillStyle).toBe('#111111'); // --ink fallback
  });
});
