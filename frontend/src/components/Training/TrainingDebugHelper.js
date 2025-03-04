// src/components/Training/TrainingDebugHelper.js
import React, { useState, useEffect } from 'react';

/**
 * A debug component to help troubleshoot training mode issues.
 * This component will display the current state of training mode variables
 * and can be temporarily added to any metronome component.
 */
const TrainingDebugHelper = ({
  macroMode,
  speedMode,
  isSilencePhaseRef,
  measureCountRef,
  measuresUntilMute,
  muteMeasureCountRef,
  muteDurationMeasures,
  tempoIncreasePercent,
  measuresUntilSpeedUp,
  enabled = false // Set to true to enable debugging
}) => {
  const [tick, setTick] = useState(0);
  
  // Update every 100ms to reflect the latest state
  useEffect(() => {
    if (!enabled) return;
    
    const timer = setInterval(() => {
      setTick(t => t + 1);
    }, 100);
    
    return () => clearInterval(timer);
  }, [enabled]);
  
  if (!enabled) return null;
  
  const windowRef = typeof window !== 'undefined' && window.isSilencePhaseRef ? 
    window.isSilencePhaseRef.current : 'Not set';
  
  const localRef = isSilencePhaseRef ? 
    isSilencePhaseRef.current : 'Not available';
  
  return (
    <div style={{
      position: 'fixed',
      bottom: '10px',
      right: '10px',
      backgroundColor: 'rgba(0,0,0,0.8)',
      color: 'white',
      padding: '10px',
      borderRadius: '5px',
      fontSize: '12px',
      fontFamily: 'monospace',
      zIndex: 9999,
      maxWidth: '300px',
      maxHeight: '200px',
      overflow: 'auto'
    }}>
      <h4 style={{ margin: '0 0 5px 0', color: '#00A0A0' }}>Training Debug</h4>
      <div>Macro Mode: {macroMode}</div>
      <div>Speed Mode: {speedMode}</div>
      <div>Local Silent: <b style={{ color: localRef === true ? '#ff5722' : 'inherit' }}>{String(localRef)}</b></div>
      <div>Global Silent: <b style={{ color: windowRef === true ? '#ff5722' : 'inherit' }}>{String(windowRef)}</b></div>
      <div>Measure: {measureCountRef?.current || 0}/{measuresUntilMute}</div>
      <div>Silence: {muteMeasureCountRef?.current || 0}/{muteDurationMeasures}</div>
      <div>Target Tempo Increase: {tempoIncreasePercent}%</div>
      <div>Measures Until Speed: {measuresUntilSpeedUp}</div>
      <div style={{ fontSize: '10px', color: '#999', marginTop: '5px' }}>Tick: {tick}</div>
    </div>
  );
};

export default TrainingDebugHelper;