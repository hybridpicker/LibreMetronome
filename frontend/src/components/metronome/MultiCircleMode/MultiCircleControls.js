import React from 'react';
import NoteSelector from '../Controls/NoteSelector';
import SubdivisionSelector from '../Controls/SubdivisionSelector';
import EditableSliderInput from '../Controls/EditableSliderInput';

/**
 * Controls component for MultiCircleMetronome
 * Provides note selection, subdivision control, and sliders for tempo/volume/swing
 */
const MultiCircleControls = ({
  circleSettings,
  setCircleSettings,
  activeCircle,
  playingCircle,
  tempo,
  setTempo,
  volume,
  setVolume,
  swing,
  setSwing
}) => {
  // Handle note selection
  const handleNoteSelection = (mode) => {
    setCircleSettings(prev => {
      const updated = [...prev];
      updated[activeCircle] = { ...updated[activeCircle], beatMode: mode };
      
      // Calculate the beat multiplier
      const multiplier = mode === "quarter" ? 1 : 2;
      
      // Only dispatch the event if the active circle is currently playing
      if (activeCircle === playingCircle) {
        // Dispatch a custom event to notify that beat mode has changed for the playing circle
        const beatModeChangeEvent = new CustomEvent('beat-mode-change', {
          detail: { 
            beatMode: mode,
            beatMultiplier: multiplier,
            circleIndex: activeCircle
          }
        });
        window.dispatchEvent(beatModeChangeEvent);
        console.log(`Dispatched beat mode change for playing circle ${activeCircle}: ${mode}`);
      } else {
        console.log(`Changed beat mode for non-playing circle ${activeCircle} (${mode}). No audio update needed.`);
      }
      
      return updated;
    });
  };
  
  // Handle subdivision changes
  const handleSetSubdivisions = (subdivisionValue) => {
    setCircleSettings(prev => {
      const updated = [...prev];
      if (activeCircle >= updated.length) return prev;
      
      updated[activeCircle] = {
        ...updated[activeCircle],
        subdivisions: subdivisionValue,
        // Create new accents array with first beat as 3 (emphasized)
        accents: Array.from({ length: subdivisionValue }, (_, i) => (i === 0 ? 3 : 1))
      };
      return updated;
    });
  };
  
  // Get current settings for active circle
  const currentSettings = circleSettings[activeCircle] || {
    subdivisions: 4,
    beatMode: "quarter",
    accents: [3, 1, 1, 1]
  };

  return (
    <div className="controls-section" style={{ marginTop: "20px" }}>
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

export default MultiCircleControls;