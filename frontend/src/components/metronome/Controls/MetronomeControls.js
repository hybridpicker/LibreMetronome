// File: src/components/metronome/MetronomeControls.js
import React from 'react';
import quarterNotesActive from '../../../assets/svg/quarter_eight_notes/quarterNotesActive.svg';
import quarterNotesInactive from '../../../assets/svg/quarter_eight_notes/quarterNotesInactive.svg';
import eightNotesActive from '../../../assets/svg/quarter_eight_notes/eightNotesActive.svg';
import eightNotesInactive from '../../../assets/svg/quarter_eight_notes/eightNotesInactive.svg';
import SubdivisionSelector from './SubdivisionSelector';

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
          <div style={{ display: "flex", justifyContent: "center", gap: "10px" }}>
            <button
              onClick={() => setBeatMode("quarter")}
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer"
              }}
            >
              <img
                src={beatMode === "quarter" ? quarterNotesActive : quarterNotesInactive}
                alt="Quarter Notes"
                style={{
                  width: "50px",
                  height: "50px",
                  opacity: beatMode === "quarter" ? 1 : 0.5,
                  transition: "all 0.15s cubic-bezier(0.25, 0.1, 0.25, 1)",
                  filter: beatMode === "quarter" ? "drop-shadow(0 0 5px rgba(0, 160, 160, 0.5))" : "none",
                  transform: beatMode === "quarter" ? "scale(1.05)" : "scale(1)"
                }}
              />
            </button>
            <button
              onClick={() => setBeatMode("eighth")}
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer"
              }}
            >
              <img
                src={beatMode === "eighth" ? eightNotesActive : eightNotesInactive}
                alt="Eighth Notes"
                style={{
                  width: "50px",
                  height: "50px",
                  opacity: beatMode === "eighth" ? 1 : 0.5,
                  transition: "all 0.15s cubic-bezier(0.25, 0.1, 0.25, 1)",
                  filter: beatMode === "eighth" ? "drop-shadow(0 0 5px rgba(0, 160, 160, 0.5))" : "none",
                  transform: beatMode === "eighth" ? "scale(1.05)" : "scale(1)"
                }}
              />
            </button>
          </div>
        </div>
      )}
      {/* Render Subdivision Selector for all modes except analog */}
      {mode !== "analog" && mode !== "multi" && (
        <div style={{ marginBottom: "20px", textAlign: "center" }}>
          <h3>Subdivision</h3>
          <SubdivisionSelector
            subdivisions={subdivisions}
            onSelect={(num) => setSubdivisions(num)}
          />
        </div>
      )}
      {/* Global Sliders - REORDERED with Tempo first */}
      <div className="sliders-container" style={{ marginTop: "20px", width: "100%", maxWidth: "300px", margin: "0 auto" }}>
        {/* Tempo slider FIRST */}
        <div className="slider-item tempo-slider" style={{ marginBottom: "10px", maxWidth: "300px", margin: "0 auto", width: "100%" }}>
          <label>Tempo: {tempo} BPM </label>
          <input
            type="range"
            min={15}
            max={240}
            step={1}
            value={tempo}
            onChange={(e) => setTempo(parseFloat(e.target.value))}
            style={{ width: "100%" }}
          />
        </div>
        
        {/* Volume slider SECOND */}
        <div className="slider-item" style={{ marginBottom: "10px", maxWidth: "300px", margin: "0 auto", width: "100%" }}>
          <label>Volume: {Math.round(volume * 100)}% </label>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            style={{ width: "100%" }}
          />
        </div>
        
        {/* Swing slider LAST - only shown when conditions are met */}
        {mode !== "analog" && subdivisions % 2 === 0 && subdivisions >= 2 && (
          <div className="slider-item" style={{ marginBottom: "10px", maxWidth: "300px", margin: "0 auto", width: "100%" }}>
            <label>Swing: {Math.round(swing * 200)}% </label>
            <input
              type="range"
              min={0}
              max={0.5}
              step={0.01}
              value={swing}
              onChange={(e) => setSwing(parseFloat(e.target.value))}
              style={{ width: "100%" }}
            />
          </div>
        )}
      </div>
    </>
  );
};

export default MetronomeControls;