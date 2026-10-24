// Phone layout helpers. On phones (viewport narrower than 600 CSS px) the whole
// practice surface has to fit on one screen without page scrolling, so the
// visualisation is sized from the space left after the fixed-height controls.
// Desktop and tablet sizing stays in the components.

export const PHONE_MAX_WIDTH = 600;

export const isPhoneViewport = () =>
  typeof window !== 'undefined' && window.innerWidth < PHONE_MAX_WIDTH;

// Pixels of viewport height used by everything except the visualisation
// (header, mode selector, transport, controls, footer), per mode.
const RESERVED_HEIGHT = {
  analog: 436,
  beat: 515,
  grid: 442,
  sequence: 535,
  polyrhythm: 506,
};

const MIN_SIZE = 130;
const MAX_SIZE = 320;

/**
 * Edge length of the square that holds the visualisation on a phone.
 * `mode` is one of analog | beat | grid | sequence | polyrhythm.
 */
export const getPhoneVisualSize = (mode) => {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const fromHeight = height - (RESERVED_HEIGHT[mode] ?? 480);
  return Math.round(
    Math.max(MIN_SIZE, Math.min(width - 40, MAX_SIZE, fromHeight))
  );
};

/**
 * Edge length of one grid-mode square on a phone. Limited by the width (every
 * beat column must fit) and by the height left under the other controls.
 */
export const getPhoneGridSquare = (beats) => {
  const gap = 4;
  const fromWidth = Math.floor((window.innerWidth - 32 - beats * gap) / beats);
  const fromHeight = Math.floor((window.innerHeight - 517) / 3);
  return Math.max(24, Math.min(60, fromWidth, fromHeight));
};
