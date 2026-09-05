import React, { useCallback, useEffect, useRef, useState } from 'react';
import { playTapFeedback } from '../../../hooks/useMetronomeLogic/tapFeedback';

const TAP_FEEDBACK_DURATION_MS = 150;

/**
 * Shared, text-first transport control used by every metronome mode.
 * The visible label is intentionally retained on touch layouts so that an
 * unavailable SVG can never leave an unexplained control surface.
 */
const TransportButton = ({
  kind,
  icon,
  label,
  onClick,
  disabled = false,
  pressed,
  feedbackVolume = 0.5,
  className = ''
}) => {
  const [isTapFeedbackActive, setIsTapFeedbackActive] = useState(false);
  const feedbackTimeoutRef = useRef(null);
  const pointerTapRef = useRef(false);
  const pressedProps = typeof pressed === 'boolean'
    ? { 'aria-pressed': pressed }
    : {};

  const showTapFeedback = useCallback(() => {
    window.clearTimeout(feedbackTimeoutRef.current);
    setIsTapFeedbackActive(true);
    feedbackTimeoutRef.current = window.setTimeout(() => {
      setIsTapFeedbackActive(false);
    }, TAP_FEEDBACK_DURATION_MS);
  }, []);

  useEffect(() => () => {
    window.clearTimeout(feedbackTimeoutRef.current);
  }, []);

  const activate = (event) => {
    if (kind === 'tap') {
      showTapFeedback();
      playTapFeedback(feedbackVolume);
    }
    if (onClick) onClick(event);
  };

  return (
    <button
      type="button"
      className={`transport-button transport-${kind} ${pressed ? 'is-playing' : ''} ${isTapFeedbackActive ? 'is-tapping' : ''} ${className}`.trim()}
      onPointerDown={(event) => {
        if (kind !== 'tap' || event.button !== 0 || event.isPrimary === false) return;
        pointerTapRef.current = true;
        activate(event);
      }}
      onKeyDown={() => { pointerTapRef.current = false; }}
      onClick={(event) => {
        if (kind === 'tap' && pointerTapRef.current) {
          pointerTapRef.current = false;
          return;
        }
        activate(event);
      }}
      disabled={disabled}
      aria-label={label}
      {...pressedProps}
    >
      {icon && kind !== 'tap' && (
        <img
          src={icon}
          alt=""
          aria-hidden="true"
          className="transport-icon"
        />
      )}
      <span className="transport-label">{label}</span>
    </button>
  );
};

export default TransportButton;
