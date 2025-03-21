import React from 'react';
import NoteSelector from '../Controls/NoteSelector';
import SubdivisionSelector from '../Controls/SubdivisionSelector';

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
        <label>
          Tempo: {tempo} BPM
          <input 
            type="range" 
            min={15} 
            max={240} 
            step={1} 
            value={tempo} 
            onChange={(e) => setTempo(Number(e.target.value))} 
          />
        </label>
        
        <label>
          Volume: {Math.round(volume * 100)}%
          <input 
            type="range" 
            min={0} 
            max={1} 
            step={0.01} 
            value={volume} 
            onChange={(e) => setVolume(Number(e.target.value))} 
          />
        </label>
        
        {currentSettings.subdivisions % 2 === 0 && (
          <label>
            Swing: {Math.round(swing * 200)}%
            <input 
              type="range" 
              min={0} 
              max={0.5} 
              step={0.01} 
              value={swing} 
              onChange={(e) => setSwing(Number(e.target.value))} 
            />
          </label>
        )}
      </div>
    </div>
  );
};

export default MultiCircleControls;