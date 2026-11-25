// src/hooks/useMetronomeLogic/soundPreload.js
//
// Gets the click sounds ready before the first beat. The active sound set is
// loaded when the app opens, so play rarely waits for it. When it is still not
// ready, play waits at most PREFERRED_CLICKS_WAIT_MS and then starts with the
// bundled clicks; the active sound set takes over at the next start.
import {
  applyClickSet,
  createProceduralClickSet,
  initAudioContext,
  loadClickSet
} from './audioBuffers';
import { getActiveSoundSet, getRememberedActiveSoundSet } from '../../services/soundSetService';

export const PREFERRED_CLICKS_WAIT_MS = 300;

// Bundled clicks per AudioContext: resolves to the click set, or null on failure
const bundledLoads = new WeakMap();

function loadBundledClicks(audioCtx) {
  if (!bundledLoads.has(audioCtx)) {
    const load = loadClickSet({ audioCtx, ignorePreferences: true }).catch((error) => {
      console.error('Bundled clicks could not be loaded:', error);
      bundledLoads.delete(audioCtx);
      return null;
    });
    bundledLoads.set(audioCtx, load);
  }
  return bundledLoads.get(audioCtx);
}

let activeSoundSetRefresh = null;

/**
 * Asks the server once per session which sound set is active, and loads that
 * set into the cache so a changed set is ready for the next start.
 */
function refreshActiveSoundSet(audioCtx) {
  if (!activeSoundSetRefresh) {
    activeSoundSetRefresh = getActiveSoundSet()
      .then((soundSet) => loadClickSet({ audioCtx, soundSet }))
      .catch((error) => {
        console.warn('Refreshing the active sound set failed:', error);
        return null;
      });
  }
  return activeSoundSetRefresh;
}

/** The active sound set from this device when known, otherwise from the server. */
async function findActiveSoundSet(audioCtx) {
  const remembered = getRememberedActiveSoundSet();
  if (remembered) {
    refreshActiveSoundSet(audioCtx);
    return remembered;
  }
  return getActiveSoundSet();
}

/** Loads the active sound set. Resolves to its click set, or null on failure. */
async function loadPreferredClicks(audioCtx) {
  let soundSet = null;
  try {
    soundSet = await findActiveSoundSet(audioCtx);
  } catch (error) {
    console.warn('Could not find the active sound set, using the cookie or defaults:', error);
  }
  try {
    return await loadClickSet({ audioCtx, soundSet });
  } catch (error) {
    console.error('The active sound set could not be loaded:', error);
    return null;
  }
}

/**
 * Starts loading the bundled clicks and the active sound set. Called when the
 * app opens; decoding works while the AudioContext is still suspended.
 */
export function preloadClickSounds(audioCtx = initAudioContext()) {
  if (!audioCtx) return Promise.resolve(null);
  loadBundledClicks(audioCtx);
  return loadPreferredClicks(audioCtx);
}

/**
 * Fills the buffer refs for a start: the active sound set if it is ready within
 * `waitMs`, otherwise the bundled clicks, otherwise synthesized clicks.
 * @returns {Promise<boolean>} false only when no clicks could be made at all
 */
export async function prepareClickBuffers({
  audioCtx,
  normalBufferRef,
  accentBufferRef,
  firstBufferRef,
  waitMs = PREFERRED_CLICKS_WAIT_MS
}) {
  if (!audioCtx) return false;
  const bundled = loadBundledClicks(audioCtx);
  const preferred = loadPreferredClicks(audioCtx);

  let timer;
  const deadline = new Promise((resolve) => {
    timer = setTimeout(() => resolve(null), waitMs);
  });
  try {
    const clicks =
      (await Promise.race([preferred, deadline])) ||
      (await Promise.race([bundled, deadline])) ||
      createProceduralClickSet(audioCtx);
    if (!clicks) return false;
    applyClickSet(clicks, { normalBufferRef, accentBufferRef, firstBufferRef });
    return true;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Loads the active sound set without a time limit, for example after the
 * player picked another one in the settings.
 * @returns {Promise<boolean>}
 */
export async function reloadClickBuffers({ audioCtx, normalBufferRef, accentBufferRef, firstBufferRef }) {
  if (!audioCtx) return false;
  const clicks =
    (await loadPreferredClicks(audioCtx)) ||
    (await loadBundledClicks(audioCtx)) ||
    createProceduralClickSet(audioCtx);
  if (!clicks) return false;
  applyClickSet(clicks, { normalBufferRef, accentBufferRef, firstBufferRef });
  return true;
}
