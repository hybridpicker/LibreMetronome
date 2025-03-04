// src/components/Training/TrainingActiveContainer.js
import React from 'react';
import './TrainingActiveContainer.css';

/**
 * A reusable component to display training mode status
 * This component shows the current status of macro-timing and speed training
 * and can be used across all metronome modes
 * 
 * @param {Object} props - Component properties
 * @param {number} props.macroMode - Current macro timing mode (0: off, 1: fixed silence, 2: random silence)
 * @param {number} props.speedMode - Current speed training mode (0: off, 1: auto increase tempo)
 * @param {Object} props.isSilencePhaseRef - Ref to silence phase state
 * @param {Object} props.measureCountRef - Ref to measure counter
 * @param {number} props.measuresUntilMute - How many measures until mute
 * @param {Object} props.muteMeasureCountRef - Ref to mute measure counter
 * @param {number} props.muteDurationMeasures - How many measures to stay muted
 * @returns {JSX.Element|null} - Training status indicator or null if training is inactive
 */
const TrainingActiveContainer = ({
  macroMode,
  speedMode,
  isSilencePhaseRef,
  measureCountRef,
  measuresUntilMute,
  muteMeasureCountRef,
  muteDurationMeasures
}) => {
  // Don't render anything if training is inactive
  if (macroMode === 0 && speedMode === 0) return null;
  
  return (
    <div className="training-active-container">
      <h4 className="training-active-title">Training Active</h4>
      
      {/* Macro-Timing Status */}
      {macroMode !== 0 && (
        <div className="training-active-status">
          Macro-Timing: {macroMode === 1 ? 'Fixed Silence' : 'Random Silence'}
          {isSilencePhaseRef?.current && 
            <span className="training-active-silent"> (Silent)</span>
          }
        </div>
      )}
      
      {/* Speed Training Status */}
      {speedMode !== 0 && (
        <div className="training-active-status">
          Speed Training: Auto Increase
        </div>
      )}
      
      {/* Measure Counters */}
      <div className="training-active-counter">
        Measures: {measureCountRef?.current || 0}/{measuresUntilMute}
        {isSilencePhaseRef?.current && ` | Silence: ${muteMeasureCountRef?.current || 0}/${muteDurationMeasures}`}
      </div>
    </div>
  );
};

export default TrainingActiveContainer;