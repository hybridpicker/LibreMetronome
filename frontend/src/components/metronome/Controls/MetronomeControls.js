// File: src/components/metronome/Controls/MetronomeControls.js
import React from 'react';
import SubdivisionSelector from './SubdivisionSelector';
import NoteSelector from './NoteSelector';
import EditableSliderInput from './EditableSliderInput';

const MetronomeControls = ({
  mode,       // "analog", "circle", "grid", "multi"
  beatMode,
  setBeatMode,
  subdivisions,
  setSubdivisions,
  swing,
  setSwing,
  volume,
  setVolume,
  tempo,
  setTempo
}) => {
  return (
    <>
      {/* Render Note Selector if mode is not "multi" */}
      {mode !== "multi" && (
        <div style={{ marginBottom: "20px", textAlign: "center" }}>
          <h3>Notes</h3>
          <NoteSelector 
            beatMode={beatMode}
            onSelect={(mode) => setBeatMode(mode)}
          />
        </div>
      )}
      
      {/* Render Subdivision Selector for all modes except analog */}
      {mode !== "analog" && mode !== "multi" && (
        <div style={{ marginBottom: "20px", textAlign: "center" }}>
          <h3>Beats per Bar</h3>
          <SubdivisionSelector
            subdivisions={subdivisions}
            onSelect={(num) => setSubdivisions(num)}
          />
        </div>
      )}
      
      {/* Global Sliders */}
      <div className="sliders-container">
          {/* Tempo slider FIRST */}
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
          
          {/* Volume slider SECOND */}
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
          
          {/* Swing slider LAST - only shown when conditions are met */}
          {mode === "analog" ? (
            <EditableSliderInput
              label="Swing"
              value={0}
              setValue={() => {}}
              min={0}
              max={0.5}
              step={0.01}
              disabled={true}
              className="swing-slider disabled"
              formatter={() => "(Swing is not available in pendulum mode)"}
            />
          ) : subdivisions % 2 === 0 && subdivisions >= 2 && (
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
          )}
      </div>
    </>
  );
};

export default MetronomeControls;