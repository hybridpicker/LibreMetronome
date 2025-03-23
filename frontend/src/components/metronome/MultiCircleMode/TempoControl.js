// src/components/metronome/MultiCircleMode/TempoControl.js
import React from 'react';
import EditableSliderInput from '../Controls/EditableSliderInput';

export const TempoControl = ({ tempo, setTempo }) => {
  return (
    <div className="slider-item tempo-slider">
      <EditableSliderInput
        label="Tempo"
        value={tempo}
        setValue={setTempo}
        min={15}
        max={240}
        step={1}
        className="tempo-slider"
        formatter={(val) => `${val} BPM`}
        parser={(val) => parseInt(val.replace(/\D/g, ''))}
      />
    </div>
  );
};

// src/components/metronome/MultiCircleMode/VolumeControl.js
export const VolumeControl = ({ volume, setVolume }) => {
  return (
    <div className="slider-item">
      <EditableSliderInput
        label="Volume"
        value={volume}
        setValue={setVolume}
        min={0}
        max={1}
        step={0.01}
        className="volume-slider"
        formatter={(val) => `${Math.round(val * 100)}%`}
        parser={(val) => parseFloat(val.replace(/[^0-9.]/g, '')) / 100}
      />
    </div>
  );
};

// src/components/metronome/MultiCircleMode/SwingControl.js
export const SwingControl = ({ swing, setSwing }) => {
  return (
    <div className="slider-item">
      <EditableSliderInput
        label="Swing"
        value={swing}
        setValue={setSwing}
        min={0}
        max={0.5}
        step={0.01}
        className="swing-slider"
        formatter={(val) => `${Math.round(val * 200)}%`}
        parser={(val) => parseFloat(val.replace(/[^0-9.]/g, '')) / 200}
      />
    </div>
  );
};

export default {
  TempoControl,
  VolumeControl,
  SwingControl
};