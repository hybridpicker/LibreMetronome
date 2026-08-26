import React from 'react';

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
  className = ''
}) => {
  const pressedProps = typeof pressed === 'boolean'
    ? { 'aria-pressed': pressed }
    : {};

  return (
    <button
      type="button"
      className={`transport-button transport-${kind} ${pressed ? 'is-playing' : ''} ${className}`.trim()}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      {...pressedProps}
    >
      {icon && (
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
