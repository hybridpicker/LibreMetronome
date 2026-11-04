import {
  OUTPUT_DRIVE,
  CURVE_SAMPLES,
  buildSoftClipCurve,
  getOutputNode
} from '../../../hooks/useMetronomeLogic/outputNode';

function makeContext({ withShaper = true } = {}) {
  const destination = { name: 'destination' };
  const shaper = { curve: null, oversample: 'none', connect: jest.fn() };
  const ctx = { destination };
  if (withShaper) ctx.createWaveShaper = jest.fn(() => shaper);
  return { ctx, shaper, destination };
}

describe('buildSoftClipCurve', () => {
  test('is tanh(drive * x) sampled over [-1, 1]', () => {
    const curve = buildSoftClipCurve();
    expect(curve).toBeInstanceOf(Float32Array);
    expect(curve).toHaveLength(CURVE_SAMPLES);
    expect(curve[0]).toBeCloseTo(-Math.tanh(OUTPUT_DRIVE), 6);
    expect(curve[(CURVE_SAMPLES - 1) / 2]).toBe(0);
    expect(curve[CURVE_SAMPLES - 1]).toBeCloseTo(Math.tanh(OUTPUT_DRIVE), 6);
    // quarter of the way up: x = 0.5
    expect(curve[(CURVE_SAMPLES - 1) * 3 / 4]).toBeCloseTo(Math.tanh(OUTPUT_DRIVE * 0.5), 6);
  });

  test('is monotonic, odd and stays below full scale', () => {
    const curve = buildSoftClipCurve();
    for (let i = 1; i < curve.length; i += 1) {
      expect(curve[i]).toBeGreaterThan(curve[i - 1]);
      expect(Math.abs(curve[i])).toBeLessThan(1);
    }
    expect(curve[100]).toBeCloseTo(-curve[curve.length - 101], 6);
  });

  test('lifts the body of a click by about +9.5 dB while limiting the peak', () => {
    const curve = buildSoftClipCurve();
    const at = (x) => curve[Math.round(((x + 1) / 2) * (CURVE_SAMPLES - 1))];
    // -15 dBFS (typical click body) comes out roughly 8.7 dB louder
    const body = Math.pow(10, -15 / 20);
    expect(20 * Math.log10(at(body) / body)).toBeCloseTo(8.7, 0);
    // 0 dBFS peaks stay just under full scale
    expect(at(1)).toBeGreaterThan(0.99);
    expect(at(1)).toBeLessThan(1);
  });

  test('accepts a custom drive and sample count', () => {
    const curve = buildSoftClipCurve(1, 3);
    expect(Array.from(curve)).toEqual([Math.tanh(-1), 0, Math.tanh(1)].map((v) => Math.fround(v)));
  });
});

describe('getOutputNode', () => {
  let warnSpy;
  beforeEach(() => {
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    warnSpy.mockRestore();
  });

  test('returns null without a context', () => {
    expect(getOutputNode(null)).toBeNull();
    expect(getOutputNode(undefined)).toBeNull();
  });

  test('builds a 2x-oversampled soft clipper in front of the destination', () => {
    const { ctx, shaper, destination } = makeContext();
    const node = getOutputNode(ctx);
    expect(node).toBe(shaper);
    expect(shaper.oversample).toBe('2x');
    expect(shaper.curve).toBeInstanceOf(Float32Array);
    expect(Array.from(shaper.curve)).toEqual(Array.from(buildSoftClipCurve()));
    expect(shaper.connect).toHaveBeenCalledWith(destination);
  });

  test('creates the output stage once per context', () => {
    const { ctx, shaper } = makeContext();
    expect(getOutputNode(ctx)).toBe(shaper);
    expect(getOutputNode(ctx)).toBe(shaper);
    expect(ctx.createWaveShaper).toHaveBeenCalledTimes(1);

    const other = makeContext();
    expect(getOutputNode(other.ctx)).toBe(other.shaper);
    expect(ctx.createWaveShaper).toHaveBeenCalledTimes(1);
    expect(other.ctx.createWaveShaper).toHaveBeenCalledTimes(1);
  });

  test('falls back to the destination when the context has no wave shaper', () => {
    const { ctx, destination } = makeContext({ withShaper: false });
    expect(getOutputNode(ctx)).toBe(destination);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  test('falls back to the destination, once, when the wave shaper cannot be created', () => {
    const { ctx, destination } = makeContext();
    ctx.createWaveShaper.mockImplementation(() => { throw new Error('no shaper'); });
    expect(getOutputNode(ctx)).toBe(destination);
    expect(getOutputNode(ctx)).toBe(destination);
    expect(ctx.createWaveShaper).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledWith(
      'Click output stage unavailable, playing clicks unboosted:',
      expect.any(Error)
    );
  });
});
