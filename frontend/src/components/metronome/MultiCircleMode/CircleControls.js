// src/components/metronome/MultiCircleMode/CircleControls.js
import React from 'react';
import NoteSelector from '../Controls/NoteSelector';
import SubdivisionSelector from '../Controls/SubdivisionSelector';

const CircleControls = ({
  currentSettings,
  setCircleSettings,
  activeCircle,
  handleSetSubdivisions,
  tempo,
  setTempo,
  volume,
  setVolume,
  swing,
  setSwing,
  isPaused,
  handlePlayPause
}) => {
  // Toggle functionality for the note selector
  const handleNoteSelection = (mode) => {
    setCircleSettings(prev => {
      const updated = [...prev];
      updated[activeCircle] = { ...updated[activeCircle], beatMode: mode };
      return updated;
    });
  };

  return (
    <div className="controls-section">
      {/* Notes section */}
      <div style={{ marginBottom: "20px", textAlign: "center" }}>
        <h3 className="section-title">Notes (Circle {activeCircle + 1})</h3>
        <NoteSelector 
          beatMode={currentSettings.beatMode}
          onSelect={handleNoteSelection}
        />
      </div>
      
      {/* Beats per Bar section */}
      <div style={{ marginBottom: "20px", textAlign: "center" }}>
        <h3 className="section-title">Beats per Bar (Circle {activeCircle + 1})</h3>
        <SubdivisionSelector
          subdivisions={currentSettings.subdivisions}
          onSelect={handleSetSubdivisions}
        />
      </div>
      
      {/* Sliders for tempo, volume, and swing */}
      <div className="sliders-container">
        <label>
          Tempo: {tempo} BPM
          <input type="range" min={15} max={240} step={1} value={tempo} onChange={(e) => setTempo(Number(e.target.value))} />
        </label>
        <label>
          Volume: {Math.round(volume * 100)}%
          <input type="range" min={0} max={1} step={0.01} value={volume} onChange={(e) => setVolume(Number(e.target.value))} />
        </label>
        {currentSettings.subdivisions % 2 === 0 && (
          <label>
            Swing: {Math.round(swing * 200)}%
            <input type="range" min={0} max={0.5} step={0.01} value={swing} onChange={(e) => setSwing(Number(e.target.value))} />
          </label>
        )}
      </div>
    </div>
  );
};

export default CircleControls;