import React, { useEffect } from 'react';

// Records the props each stub received last, keyed by stub name.
export const stubProps = {};

const KEYS = [
  'tempo', 'isPaused', 'volume', 'swing', 'subdivisions', 'beatMultiplier',
  'macroMode', 'speedMode', 'measuresUntilMute', 'muteDurationMeasures',
  'muteProbability', 'tempoIncreasePercent', 'measuresUntilSpeedUp',
  'soundSetReloadTrigger', 'analogMode', 'gridMode'
];

/**
 * Creates a light stand-in for a heavy mode component. It prints the props
 * it received as data attributes, remembers them in `stubProps[name]`, and
 * registers a togglePlay / tapTempo handler like a real mode would.
 */
export const makeModeStub = (name, { registers = true } = {}) => {
  const Stub = (props) => {
    stubProps[name] = props;
    const { registerTogglePlay, registerTapTempo } = props;

    useEffect(() => {
      if (!registers) return;
      if (registerTogglePlay) registerTogglePlay(Stub.toggle);
      if (registerTapTempo) registerTapTempo(Stub.tap);
    }, [registerTogglePlay, registerTapTempo]);

    const data = {};
    KEYS.forEach((key) => {
      if (props[key] !== undefined) data[`data-${key.toLowerCase()}`] = String(props[key]);
    });
    return <div data-testid={`${name}-stub`} {...data} />;
  };
  Stub.toggle = jest.fn();
  Stub.tap = jest.fn();
  return Stub;
};
