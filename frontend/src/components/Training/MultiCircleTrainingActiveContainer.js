// src/components/Training/MultiCircleTrainingActiveContainer.js
import React, { useState, useEffect } from 'react';
import './TrainingActiveContainer.css'; // Reuse the same CSS

/**
 * A specialized version of TrainingActiveContainer for Multi Circle Mode
 * 
 * This component shows the current status of macro-timing and speed training
 * specifically optimized for the multi-circle metronome mode
 */
const MultiCircleTrainingActiveContainer = ({
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
  // State for tracking current values
  const [measureCount, setMeasureCount] = useState(0);
  const [muteMeasureCount, setMuteMeasureCount] = useState(0);
  const [isSilencePhase, setIsSilencePhase] = useState(false);
  const [forceUpdate, setForceUpdate] = useState(0);
  
  // Listen for training measure updates to force re-renders
  useEffect(() => {
    // Only set up listeners if training is active
    if (macroMode === 0 && speedMode === 0) return;
    
    const handleMeasureUpdate = () => {
      // Read current values from refs
      if (measureCountRef) setMeasureCount(measureCountRef.current || 0);
      if (muteMeasureCountRef) setMuteMeasureCount(muteMeasureCountRef.current || 0);
      if (isSilencePhaseRef) setIsSilencePhase(isSilencePhaseRef.current || false);
      
      // Force re-render
      setForceUpdate(prev => prev + 1);
    };
    
    window.addEventListener('training-measure-update', handleMeasureUpdate);
    
    // Set up a regular polling interval for Multi Circle Mode
    const pollInterval = setInterval(() => {
      // Read values directly from refs
      if (measureCountRef) setMeasureCount(measureCountRef.current || 0);
      if (muteMeasureCountRef) setMuteMeasureCount(muteMeasureCountRef.current || 0);
      if (isSilencePhaseRef) setIsSilencePhase(isSilencePhaseRef.current || false);
      
      // Check global reference as fallback
      if (window.isSilencePhaseRef && isSilencePhaseRef !== window.isSilencePhaseRef) {
        setIsSilencePhase(window.isSilencePhaseRef.current || false);
      }
      
      setForceUpdate(prev => prev + 1);
    }, 300);
    
    // Initial read
    handleMeasureUpdate();
    
    return () => {
      window.removeEventListener('training-measure-update', handleMeasureUpdate);
      clearInterval(pollInterval);
    };
  }, [macroMode, speedMode, measureCountRef, muteMeasureCountRef, isSilencePhaseRef]);
  
  // Don't render anything if training is inactive
  if (macroMode === 0 && speedMode === 0) return null;
  
  // Calculate progress percentages for visual indicators
  const measureProgress = Math.min(100, (measureCount / measuresUntilMute) * 100);
  const muteProgress = Math.min(100, (muteMeasureCount / muteDurationMeasures) * 100);
  
  // Calculate current and remaining measures for speed training
  const currentMeasure = speedMode === 1 ? 
    (measureCount % measuresUntilSpeedUp) || measuresUntilSpeedUp : 0;
    
  const remainingMeasures = speedMode === 1 ? 
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
          
          {isSilencePhase ? (
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
                  {muteMeasureCount === 0 ? 
                    "Starting silent phase" : 
                    `Silent measure ${muteMeasureCount} of ${muteDurationMeasures}`}
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
                  {formatMeasureText(measureCount, measuresUntilMute)}
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
        {macroMode !== 0 && isSilencePhase ? (
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

export default MultiCircleTrainingActiveContainer;