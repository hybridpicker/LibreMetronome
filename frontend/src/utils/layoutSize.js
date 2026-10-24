// Size helpers shared by every layout (phone, tablet, desktop).
//
// The page is one grid that never scrolls (see styles/layout.css). CSS decides
// how much room the visualisation area gets; this hook only reports that size
// in CSS pixels so SVG, canvas and DOM visualisations can scale to it.
import { useLayoutEffect, useRef, useState } from 'react';

/**
 * Measures the visualisation area (the element the returned ref is attached
 * to) with a ResizeObserver. Returns { width, height } in CSS pixels, or zeros
 * until the element is laid out.
 */
export const useVizCardSize = () => {
  const ref = useRef(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const measure = () => {
      const next = { width: el.clientWidth, height: el.clientHeight };
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
