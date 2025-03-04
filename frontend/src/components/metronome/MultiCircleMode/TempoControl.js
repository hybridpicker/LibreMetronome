// src/components/metronome/MultiCircleMode/TempoControl.js
import React from 'react';

export const TempoControl = ({ tempo, setTempo }) => {
  return (
    <div className="slider-item tempo-slider">
      <label>Tempo: {tempo} BPM</label>
      <input
        type="range"
        min={15}
        max={240}
        step={1}
        value={tempo}
        onChange={e => setTempo(parseFloat(e.target.value))}
      />
    </div>
  );
};

// src/components/metronome/MultiCircleMode/VolumeControl.js
export const VolumeControl = ({ volume, setVolume }) => {
  return (
    <div className="slider-item">
      <label>Volume: {Math.round(volume * 100)}%</label>
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={volume}
        onChange={e => setVolume(parseFloat(e.target.value))}
      />
    </div>
  );
};

// src/components/metronome/MultiCircleMode/SwingControl.js
export const SwingControl = ({ swing, setSwing }) => {
  return (
    <div className="slider-item">
      <label>Swing: {Math.round(swing * 200)}%</label>
      <input
        type="range"
        min={0}
        max={0.5}
        step={0.01}
        value={swing}
        onChange={e => setSwing(parseFloat(e.target.value))}
      />
    </div>
  );
};

export default {
  TempoControl,
  VolumeControl,
  SwingControl
};