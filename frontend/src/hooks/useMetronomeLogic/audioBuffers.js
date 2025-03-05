// src/hooks/useMetronomeLogic/audioBuffers.js
export let globalAudioCtx = null;

/**
 * Ensures we have one global AudioContext
 * (only create a new one if none exists or the previous is closed)
 */
export function initAudioContext() {
  if (!globalAudioCtx || globalAudioCtx.state === 'closed') {
    try {
      globalAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (err) {
      console.error("Error creating AudioContext:", err);
      globalAudioCtx = null;
    }
  }
  return globalAudioCtx;
}

/**
 * Loads a single audio file and decodes it into a Web Audio buffer.
 */
function loadSound(url, audioCtx) {
  return fetch(url)
    .then(res => {
      if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
      return res.arrayBuffer();
    })
    .then(buffer => audioCtx.decodeAudioData(buffer))
    .catch(err => {
      console.error(`Failed loading sound ${url}:`, err);
      return null;
    });
}

/**
 * Loads your standard metronome click buffers (normal, accent, first).
 * Update paths as needed.
 */
export async function loadClickBuffers({
  audioCtx,
  normalBufferRef,
  accentBufferRef,
  firstBufferRef
}) {
  if (!audioCtx) return;
  const [normal, accent, first] = await Promise.all([
    loadSound('/assets/audio/click_new.mp3', audioCtx),
    loadSound('/assets/audio/click_new_accent.mp3', audioCtx),
    loadSound('/assets/audio/click_new_first.mp3', audioCtx)
  ]);

  if (normal) normalBufferRef.current = normal;
  if (accent) accentBufferRef.current = accent;
  if (first) firstBufferRef.current = first;
}