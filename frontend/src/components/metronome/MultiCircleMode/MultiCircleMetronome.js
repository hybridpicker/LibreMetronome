// src/components/metronome/MultiCircleMode/MultiCircleMetronome.js

import React, { useState } from 'react';
import EditableSliderInput from '../Controls/EditableSliderInput';
import CircleRenderer from './CircleRenderer';

const MultiCircleMetronome = (props) => {
  // Use the props if provided, otherwise use our own state
  const [internalTempo, setInternalTempo] = useState(120);
  const [internalVolume, setInternalVolume] = useState(50);
  
  // Allow both internal state management and external props
  const tempo = props.tempo !== undefined ? props.tempo : internalTempo;
  const volume = props.volume !== undefined ? props.volume : internalVolume;
  
  const setTempo = (value) => {
    if (props.setTempo) {
      props.setTempo(value);
    } else {
      setInternalTempo(value);
    }
  };
  
  const setVolume = (value) => {
    if (props.setVolume) {
      props.setVolume(value);
    } else {
      setInternalVolume(value);
    }
  };
  
  return (
    <div className="multi-circle-metronome">
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
      </div>
      
      <CircleRenderer />
    </div>
  );
};

export default MultiCircleMetronome;