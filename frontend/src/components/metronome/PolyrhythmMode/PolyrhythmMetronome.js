// src/components/metronome/PolyrhythmMode/PolyrhythmMetronome.js

import React, { useState } from 'react';
import PolyrhythmEditableSlider from './PolyrhythmEditableSlider';
import CircleRenderer from './CircleRenderer';
import DirectBeatIndicator from './DirectBeatIndicator';

const PolyrhythmMetronome = (props) => {
  // Use the props if provided, otherwise use our own state
  const [internalTempo, setInternalTempo] = useState(120);
  const [internalVolume, setInternalVolume] = useState(50);
  const [internalSubdivisions, setInternalSubdivisions] = useState({ inner: 3, outer: 4 });
  
  // Allow both internal state management and external props
  const tempo = props.tempo !== undefined ? props.tempo : internalTempo;
  const volume = props.volume !== undefined ? props.volume : internalVolume;
  
  // Add the debouncedSetSubdivisions function with the correct implementation
  const debouncedSetSubdivisions = (value, circle) => {
    // Implementation for debounced subdivision changes
    if (circle === 'inner') {
      setInternalSubdivisions(prev => ({ ...prev, inner: value }));
      if (props.setInnerSubdivisions) {
        props.setInnerSubdivisions(value);
      }
    } else if (circle === 'outer') {
      setInternalSubdivisions(prev => ({ ...prev, outer: value }));
      if (props.setOuterSubdivisions) {
        props.setOuterSubdivisions(value);
      }
    }
  };
  
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
    <div className="polyrhythm-metronome">
      <div className="metronome-controls">
        <PolyrhythmEditableSlider
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
        
        <PolyrhythmEditableSlider
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
      <DirectBeatIndicator />
    </div>
  );
};

export default PolyrhythmMetronome;