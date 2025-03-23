import React, { useState, useCallback } from 'react';
import BaseMetronomeLayout from './BaseMetronomeLayout';
import NoteSelector from './Controls/NoteSelector';
import SubdivisionSelector from './Controls/SubdivisionSelector';
import AccelerateButton from './Controls/AccelerateButton';
import { manualTempoAcceleration } from '../../hooks/useMetronomeLogic/trainingLogic';

const BaseMetronome = ({ 
  mode = 'circle',
  macroMode = 0,
  speedMode = 0,
  tempoIncreasePercent = 5
}) => {
  const [tempo, setTempo] = useState(120);
  const [volume, setVolume] = useState(0.5);
  const [swing, setSwing] = useState(0);
  const [isPaused, setIsPaused] = useState(true);
  const [subdivisions, setSubdivisions] = useState(4);
  const [beatMode, setBeatMode] = useState('quarter');

  // Handle play/pause toggle
  const handleTogglePlay = () => {
    setIsPaused(!isPaused);
  };

  // Handle tap tempo
  const handleTapTempo = () => {
    console.log("Tap tempo clicked in BaseMetronome");
    // Implement tap tempo logic here
    window.dispatchEvent(
      new CustomEvent("metronome-tap-tempo", {
        detail: { timestamp: performance.now() }
      })
    );
  };
  
  // Handle accelerate tempo for speed training
  const handleAccelerate = useCallback(() => {
    if (!isPaused && (speedMode === 1 || speedMode === 2)) {
      console.log(`[BaseMetronome] Manual tempo acceleration (${tempoIncreasePercent}%) - Speed Mode: ${speedMode}`);
      
      manualTempoAcceleration({
        tempoIncreasePercent,
        tempoRef: { current: tempo },
        setTempo
      });
    }
  }, [isPaused, speedMode, tempoIncreasePercent, tempo, setTempo]);

  return (
    <div>
      {/* Notes and Subdivision Selectors */}
      <div style={{ marginBottom: "20px", textAlign: "center" }}>
        <h3 className="section-title">Notes</h3>
        <NoteSelector 
          beatMode={beatMode}
          onSelect={setBeatMode}
        />
      </div>
      
      <div style={{ marginBottom: "20px", textAlign: "center" }}>
        <h3 className="section-title">Beats per Bar</h3>
        <SubdivisionSelector
          subdivisions={subdivisions}
          onSelect={setSubdivisions}
        />
      </div>
      
      {/* Metronome Layout with Visualization and Controls */}
      {/* Accelerate Button for speed training */}
      <AccelerateButton onClick={handleAccelerate} speedMode={speedMode} />
      
      <BaseMetronomeLayout
        tempo={tempo}
        setTempo={setTempo}
        volume={volume}
        setVolume={setVolume}
        swing={swing}
        setSwing={setSwing}
        isPaused={isPaused}
        onTogglePlay={handleTogglePlay}
        onTapTempo={handleTapTempo}
        showSwingSlider={subdivisions % 2 === 0}
      >
        {/* Placeholder content based on mode */}
        <div 
          className={`metronome-visualization ${mode}-mode`}
          style={{ 
            width: '100%', 
            height: '100%', 
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            borderRadius: mode === 'circle' ? '50%' : '0',
            backgroundColor: 'var(--neutral-bg, #f5f5f5)',
            border: '2px solid var(--primary-teal, #00a0a0)'
          }}
        >
          {mode.charAt(0).toUpperCase() + mode.slice(1)} Mode
        </div>
      </BaseMetronomeLayout>
    </div>
  );
};

export default BaseMetronome;