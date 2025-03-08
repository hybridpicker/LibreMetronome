// File: src/components/metronome/Controls/MetronomeControls.js
import React from 'react';
import SubdivisionSelector from './SubdivisionSelector';
import NoteSelector from './NoteSelector';

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
          <label>
            Tempo: {tempo} BPM
            <input
              type="range"
              min={15}
              max={240}
              step={1}
              value={tempo}
              onChange={(e) => setTempo(parseFloat(e.target.value))}
              className="tempo-slider"
            />
          </label>
          
          {/* Volume slider SECOND */}
          <label>
            Volume: {Math.round(volume * 100)}%
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="volume-slider"
            />
          </label>
          
          {/* Swing slider LAST - only shown when conditions are met */}
          {mode !== "analog" && subdivisions % 2 === 0 && subdivisions >= 2 && (
            <label>
              Swing: {Math.round(swing * 200)}%
              <input
                type="range"
                min={0}
                max={0.5}
                step={0.01}
                value={swing}
                onChange={(e) => setSwing(parseFloat(e.target.value))}
                className="swing-slider"
              />
            </label>
          )}
      </div>
    </>
  );
};

export default MetronomeControls;