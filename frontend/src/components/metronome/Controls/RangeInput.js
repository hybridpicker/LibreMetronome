// src/components/metronome/Controls/RangeInput.js
import React from 'react';

/**
 * A range input with a 1 px track and a 1.5 px blue progress line. WebKit
 * cannot style the filled part of a track without a gradient, so the
 * progress is its own element, sized from the value. The thumb (a notehead)
 * is drawn by the global stylesheet. All other props go to the input.
 */
const RangeInput = ({ value, min, max, step, className = '', ...rest }) => {
  const lo = Number(min);
  const hi = Number(max);
  const ratio = hi === lo ? 0 : Math.max(0, Math.min(1, (Number(value) - lo) / (hi - lo)));
  return (
    <span
      className={`range-field${rest.disabled ? ' is-disabled' : ''}`}
      style={{ '--range-p': ratio }}
    >
      <span className="range-progress" aria-hidden="true" />
      <input type="range" min={min} max={max} step={step} value={value} className={className} {...rest} />
    </span>
  );
};

export default RangeInput;
