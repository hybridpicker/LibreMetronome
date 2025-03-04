// src/components/metronome/MultiCircleMode/TrainingStatus.js
import React from 'react';

const TrainingStatus = ({
  macroMode,
  speedMode,
  isSilencePhaseRef,
  measureCountRef,
  measuresUntilMute,
  muteMeasureCountRef,
  muteDurationMeasures
}) => {
  if (macroMode === 0 && speedMode === 0) return null;
  
  return (
    <div className="training-status">
      <h4>Training Active</h4>
      {macroMode !== 0 && (
        <div style={{marginBottom: '5px', fontSize: '14px'}}>
          Macro-Timing: {macroMode === 1 ? 'Fixed Silence' : 'Random Silence'}
          {isSilencePhaseRef.current && 
            <span className="silent-label"> (Silent)</span>
          }
        </div>
      )}
      {speedMode !== 0 && (
        <div style={{fontSize: '14px'}}>
          Speed Training: Auto Increase
        </div>
      )}
      
      {/* Diagnostic counters */}
      <div style={{fontSize: '14px', color: '#666', marginTop: '5px'}}>
        Measures: {measureCountRef.current}/{measuresUntilMute}
        {isSilencePhaseRef.current && ` | Silence: ${muteMeasureCountRef.current}/${muteDurationMeasures}`}
      </div>
    </div>
  );
};

export default TrainingStatus;