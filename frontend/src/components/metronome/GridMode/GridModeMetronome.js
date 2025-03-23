// src/components/metronome/GridMode/GridModeMetronome.js

import React, { useState, useEffect } from 'react';
import EditableSliderInput from '../Controls/EditableSliderInput';

const GridModeMetronome = (props) => {
  // Use props values if provided, otherwise use internal state
  const [internalTempo, setInternalTempo] = useState(props.tempo || 120);
  const [internalSubdivisions, setInternalSubdivisions] = useState(props.subdivisions || 4);
  const [internalSwing, setInternalSwing] = useState(props.swing || 0);
  const [internalVolume, setInternalVolume] = useState(props.volume || 50);
  
  // Update internal state when props change
  useEffect(() => {
    if (props.tempo !== undefined) setInternalTempo(props.tempo);
  }, [props.tempo]);
  
  useEffect(() => {
    if (props.subdivisions !== undefined) setInternalSubdivisions(props.subdivisions);
  }, [props.subdivisions]);
  
  useEffect(() => {
    if (props.swing !== undefined) setInternalSwing(props.swing);
  }, [props.swing]);
  
  useEffect(() => {
    if (props.volume !== undefined) setInternalVolume(props.volume);
  }, [props.volume]);
  
  // Handler functions that call props functions if they exist
  const setTempo = (value) => {
    if (props.setTempo) {
      props.setTempo(value);
    }
    setInternalTempo(value);
  };
  
  const setSubdivisions = (value) => {
    if (props.setSubdivisions) {
      props.setSubdivisions(value);
    }
    setInternalSubdivisions(value);
  };
  
  const setSwing = (value) => {
    if (props.setSwing) {
      props.setSwing(value);
    }
    setInternalSwing(value);
  };
  
  const setVolume = (value) => {
    if (props.setVolume) {
      props.setVolume(value);
    }
    setInternalVolume(value);
  };
  
  // Use the props if available, otherwise use the internal state
  const tempo = props.tempo !== undefined ? props.tempo : internalTempo;
  const subdivisions = props.subdivisions !== undefined ? props.subdivisions : internalSubdivisions;
  const swing = props.swing !== undefined ? props.swing : internalSwing;
  const volume = props.volume !== undefined ? props.volume : internalVolume;
  
  // Register callbacks if provided
  useEffect(() => {
    if (props.registerTogglePlay && typeof props.registerTogglePlay === 'function') {
      props.registerTogglePlay(() => {
        if (props.setIsPaused) {
          props.setIsPaused(!props.isPaused);
        }
      });
    }
  }, [props.registerTogglePlay, props.isPaused, props.setIsPaused]);

  useEffect(() => {
    if (props.registerTapTempo && typeof props.registerTapTempo === 'function') {
      props.registerTapTempo(() => {
        // Implementation for tap tempo
      });
    }
  }, [props.registerTapTempo]);
  
  return (
    <div className="grid-mode-metronome">
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
        
        {subdivisions % 2 === 0 && subdivisions >= 2 && (
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
        )}
      </div>
    </div>
  );
};

export default GridModeMetronome;