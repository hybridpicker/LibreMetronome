// src/components/Training/TrainingActiveContainer.js
import React, { useState, useEffect } from 'react';
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
 * @param {number} props.tempoIncreasePercent - Tempo increase percentage for speed training
 * @param {number} props.measuresUntilSpeedUp - Measures until speed up for speed training
 * @returns {JSX.Element|null} - Training status indicator or null if training is inactive
 */
const TrainingActiveContainer = ({
  macroMode,
  speedMode,
  isSilencePhaseRef,
  measureCountRef,
  measuresUntilMute,
  muteMeasureCountRef,
  muteDurationMeasures,
  tempoIncreasePercent,
  measuresUntilSpeedUp
}) => {
  // Always declare hooks at the top level, regardless of conditions
  const [, setForceUpdate] = useState(0);
  
  // Listen for training measure updates to force re-renders
  useEffect(() => {
    // Only set up listeners if training is active
    if (macroMode === 0 && speedMode === 0) return;
    
    const handleMeasureUpdate = () => {
      setForceUpdate(prev => prev + 1);
    };
    
    window.addEventListener('training-measure-update', handleMeasureUpdate);
    
    // Set up a regular polling interval as a fallback
    const pollInterval = setInterval(() => {
      setForceUpdate(prev => prev + 1);
    }, 500);
    
    return () => {
      window.removeEventListener('training-measure-update', handleMeasureUpdate);
      clearInterval(pollInterval);
    };
  }, [macroMode, speedMode]);
  
  // Don't render anything if training is inactive
  if (macroMode === 0 && speedMode === 0) return null;
  
  // Calculate progress percentages for visual indicators
  const measureProgress = measureCountRef?.current ? 
    Math.min(100, (measureCountRef.current / measuresUntilMute) * 100) : 0;
  
  const muteProgress = muteMeasureCountRef?.current && muteDurationMeasures ? 
    Math.min(100, (muteMeasureCountRef.current / muteDurationMeasures) * 100) : 0;
  
  // Calculate current and remaining measures for speed training
  const currentMeasure = speedMode === 1 && measureCountRef?.current ? 
    (measureCountRef.current % measuresUntilSpeedUp) || measuresUntilSpeedUp : 0;
    
  const remainingMeasures = speedMode === 1 && measuresUntilSpeedUp ? 
    measuresUntilSpeedUp - currentMeasure : 0;
  
  // Format measure text
  const formatMeasureText = (current, total) => {
    if (current === 0 && total === 0) return "Ready to start";
    if (current === 0) return `Starting ${total}-measure cycle`;
    if (current === 1) return `Measure ${current} of ${total}`;
    return `Measure ${current} of ${total}`;
  };
  
  // Format countdown text
  const formatCountdownText = (remaining) => {
    if (remaining === 0) return "Increasing tempo now";
    if (remaining === 1) return "1 measure left";
    return `${remaining} measures left`;
  };
  
  // Debug output to help diagnose issues
  console.log('TrainingActiveContainer render:', {
    macroMode,
    speedMode,
    isSilencePhase: isSilencePhaseRef?.current,
    measureCount: measureCountRef?.current,
    muteMeasureCount: muteMeasureCountRef?.current,
    currentMeasure,
    remainingMeasures
  });
  
  return (
    <div className="training-active-container">
      <div className="training-active-header">
        <div className="training-active-indicator"></div>
        <h4 className="training-active-title">Training Mode Active</h4>
      </div>
      
      {/* Macro-Timing Status */}
      {macroMode !== 0 && (
        <div className="training-active-section">
          <div className="training-active-section-header">
            <span className="training-active-section-title">Macro-Timing</span>
            <span className="training-active-section-type">
              {macroMode === 1 ? 'Fixed Silence' : 'Random Silence'}
            </span>
          </div>
          
          {isSilencePhaseRef?.current ? (
            <div className="training-active-status-box silent">
              <div className="status-icon">🔇</div>
              <div className="status-info">
                <span className="status-label">Silent Phase</span>
                <div className="progress-container">
                  <div 
                    className="progress-bar" 
                    style={{width: `${muteProgress}%`}}
                  ></div>
                </div>
                <span className="counter-text">
                  {muteMeasureCountRef?.current === 0 ? 
                    "Starting silent phase" : 
                    `Silent measure ${muteMeasureCountRef?.current} of ${muteDurationMeasures}`}
                </span>
              </div>
            </div>
          ) : (
            <div className="training-active-status-box playing">
              <div className="status-icon">🔊</div>
              <div className="status-info">
                <span className="status-label">Playing Phase</span>
                <div className="progress-container">
                  <div 
                    className="progress-bar" 
                    style={{width: `${measureProgress}%`}}
                  ></div>
                </div>
                <span className="counter-text">
                  {formatMeasureText(measureCountRef?.current || 0, measuresUntilMute)}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Speed Training Status */}
      {speedMode !== 0 && (
        <div className="training-active-section">
          <div className="training-active-section-header">
            <span className="training-active-section-title">Speed Training</span>
            <span className="training-active-section-type">
              {speedMode === 1 ? 'Auto Increase' : 'Manual Increase'}
            </span>
          </div>
          
          <div className="training-active-status-box speed">
            <div className="status-icon">⏱️</div>
            <div className="status-info">
              {speedMode === 1 ? (
                <>
                  <span className="status-label">Next Increase In</span>
                  <div className="progress-container">
                    <div 
                      className="progress-bar" 
                      style={{
                        width: `${(currentMeasure / measuresUntilSpeedUp) * 100}%`
                      }}
                    ></div>
                  </div>
                  <span className="counter-text">
                    {formatCountdownText(remainingMeasures)}
                  </span>
                </>
              ) : (
                <span className="status-label">
                  Press "Accelerate" to increase tempo by {tempoIncreasePercent}%
                </span>
              )}
            </div>
          </div>
        </div>
      )}
      
      <div className="training-active-tip">
        <span className="tip-icon">💡</span>
        {macroMode !== 0 && isSilencePhaseRef?.current ? (
          <span className="tip-text">Focus on maintaining your internal tempo during silence</span>
        ) : speedMode !== 0 ? (
          <span className="tip-text">Maintain good technique as the tempo increases</span>
        ) : (
          <span className="tip-text">Use training mode to improve your timing skills</span>
        )}
      </div>
    </div>
  );
};

export default TrainingActiveContainer;