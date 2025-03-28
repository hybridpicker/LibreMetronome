// src/components/metronome/MultiCircleMode/CircleControls.js
import React from 'react';
import NoteSelector from '../Controls/NoteSelector';
import SubdivisionSelector from '../Controls/SubdivisionSelector';
import EditableSliderInput from '../Controls/EditableSliderInput';

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
        
        {currentSettings.subdivisions % 2 === 0 && (
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
    </div>
  );
};

export default CircleControls;