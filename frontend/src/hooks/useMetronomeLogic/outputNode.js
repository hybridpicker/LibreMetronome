// src/hooks/useMetronomeLogic/outputNode.js
//
// Shared output stage for the metronome clicks.
//
// The bundled click samples already peak at 0 dBFS and the default volume is
// unity, yet the web app was still too quiet: a click is only about 60 ms long
// and its body sits roughly 15 dB below the peak, so the perceived loudness is
// far lower than the peak suggests. Every click therefore runs through a soft
// clipper (tanh) that lifts the body of the sample by OUTPUT_DRIVE (about
// +9.5 dB) while the peaks stay just below full scale. Hard clipping at the
// destination is avoided, and the volume slider still scales the click body
// linearly because only the loudest few milliseconds are compressed.

export const OUTPUT_DRIVE = 3;
export const CURVE_SAMPLES = 2049;

/**
 * Transfer curve for the WaveShaperNode: y = tanh(drive * x) for x in [-1, 1].
 */
export function buildSoftClipCurve(drive = OUTPUT_DRIVE, samples = CURVE_SAMPLES) {
  const curve = new Float32Array(samples);
  const last = samples - 1;
  for (let i = 0; i < samples; i += 1) {
    const x = (2 * i) / last - 1;
    curve[i] = Math.tanh(drive * x);
  }
  return curve;
}

// One output stage per AudioContext; the context is reused across modes.
const outputNodes = new WeakMap();

/**
 * Returns the node that click gain nodes should connect to: a soft clipper in
 * front of the destination, or the destination itself where the WaveShaperNode
 * is unavailable or cannot be created.
 */
export function getOutputNode(audioCtx) {
  if (!audioCtx) return null;
  const cached = outputNodes.get(audioCtx);
  if (cached) return cached;

  let node = audioCtx.destination;
  if (typeof audioCtx.createWaveShaper === 'function') {
    try {
      const shaper = audioCtx.createWaveShaper();
      shaper.curve = buildSoftClipCurve();
      shaper.oversample = '2x';
      shaper.connect(audioCtx.destination);
      node = shaper;
    } catch (error) {
      console.warn('Click output stage unavailable, playing clicks unboosted:', error);
      node = audioCtx.destination;
    }
  }
  outputNodes.set(audioCtx, node);
  return node;
}
