// src/components/metronome/BaseMetronome.js

import React, { useState } from 'react';
import EditableSliderInput from './Controls/EditableSliderInput';

const BaseMetronome = ({ mode = 'circle' }) => {
  const [tempo, setTempo] = useState(120);
  const [volume, setVolume] = useState(50);
  const [swing, setSwing] = useState(0);

  return (
    <div className={`metronome-container ${mode}-mode`}>
      <div className="metronome-controls">
        <EditableSliderInput
          label="Tempo"
          value={tempo}
          setValue={setTempo}
          min={40}
          max={240}
          step={1}
          className="tempo-slider"
          formatter={(val) => `${val} BPM`}
          parser={(val) => parseInt(val.replace(/\D/g, ''))}
        />
        
        <EditableSliderInput
          label="Volume"
          value={volume}
          setValue={setVolume}
          min={0}
          max={100}
          step={1}
          className="volume-slider"
          formatter={(val) => `${val}%`}
          parser={(val) => parseInt(val.replace(/\D/g, ''))}
        />
        
        <EditableSliderInput
          label="Swing"
          value={swing}
          setValue={setSwing}
          min={0}
          max={100}
          step={1}
          className="swing-slider"
          formatter={(val) => `${val}%`}
          parser={(val) => parseInt(val.replace(/\D/g, ''))}
        />
      </div>
    </div>
  );
};

export default BaseMetronome;