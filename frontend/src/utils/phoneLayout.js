// Phone layout helpers. On phones (viewport narrower than 600 CSS px) the page
// is one flex/grid column that never scrolls: header, mode pill, visualisation
// card, controls card, action bar. CSS gives the visualisation card whatever
// height is left; this file only tells SVG/canvas/DOM visualisations how big
// their card is so they can scale to it. Desktop and tablet sizing stays in
// the components.
import { useLayoutEffect, useRef, useState } from 'react';

export const PHONE_MAX_WIDTH = 600;

// The visualisation card is never planned smaller than this many CSS pixels.
export const VIZ_MIN_HEIGHT = 220;

export const isPhoneViewport = () =>
  typeof window !== 'undefined' && window.innerWidth < PHONE_MAX_WIDTH;

const outerHeight = (el) => {
  if (!el) return 0;
  const box = el.getBoundingClientRect();
  if (!box.height) return 0;
  const cs = window.getComputedStyle(el);
  return box.height + (parseFloat(cs.marginTop) || 0) + (parseFloat(cs.marginBottom) || 0);
};

/**
 * Height available to the visualisation card: the viewport height minus the
 * measured chrome (header, mode pill, controls card, action bar, footer line
 * and the app container's own padding). Used for the very first render, before
 * the card itself can be measured.
 */
export const getPhoneVizHeight = () => {
  const root = document.querySelector('.app-container');
  if (!root) return VIZ_MIN_HEIGHT;
  const rootStyle = window.getComputedStyle(root);
  const padding = (parseFloat(rootStyle.paddingTop) || 0) + (parseFloat(rootStyle.paddingBottom) || 0);
  const chrome = [
    '.header',
    '.mode-selector-container',
    '.practice-controls',
    '.multi-controls-panel',
    '.polyrhythm-controls-card',
    '.transport-row',
    '.footer'
  ].reduce((sum, selector) => sum + outerHeight(root.querySelector(selector)), 0);
  const vizMargin = 10;
  return Math.max(VIZ_MIN_HEIGHT, Math.round(window.innerHeight - padding - chrome - vizMargin));
};

/**
 * Measures the visualisation card (the element the returned ref is attached
 * to) with a ResizeObserver. Returns { width, height } in CSS pixels, or zeros
 * when the viewport is not a phone or the card is not laid out yet; callers
 * then keep their desktop sizing.
 */
export const useVizCardSize = () => {
  const ref = useRef(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const measure = () => {
      const next = isPhoneViewport()
        ? { width: el.clientWidth, height: el.clientHeight }
        : { width: 0, height: 0 };
      setSize((prev) =>
        prev.width === next.width && prev.height === next.height ? prev : next
      );
    };
    measure();
    let observer = null;
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(measure);
      observer.observe(el);
    }
    window.addEventListener('resize', measure);
    return () => {
      if (observer) observer.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, []);

  return [ref, size];
};
