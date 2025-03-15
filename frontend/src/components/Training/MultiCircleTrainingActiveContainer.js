// src/components/Training/MultiCircleTrainingActiveContainer.js
import React, { useState, useEffect } from 'react';
import './TrainingActiveContainer.css'; // Reuse the same CSS
import useWindowDimensions from '../../hooks/useWindowDimensions';

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
  const [tipIndex, setTipIndex] = useState(0);
  
  // Check if device is mobile
  const { width } = useWindowDimensions();
  const isMobile = width <= 768;
  
  // Training tips array - customized for multi-circle mode
  const silentPhaseTips = [
    "Focus on maintaining your internal tempo during silence",
    "Try counting out loud to stay on beat during the silent phase",
    "Imagine hearing the metronome in your head while it's silent",
    "Keep your movements consistent during both silent and playing phases",
    "In multi-circle mode, visualize the pattern continuing through silence"
  ];
  
  const speedTrainingTips = [
    "Maintain good technique as the tempo increases",
    "Keep your movements relaxed and efficient at higher speeds",
    "Focus on precision rather than just speed",
    "Start slow and build gradually for the best results",
    "Multi-circle patterns become more challenging at higher tempos - stay focused"
  ];
  
  const generalTips = [
    "Use training mode regularly to improve your timing skills",
    "Practice switching between different polyrhythmic patterns",
    "Multi-circle training helps develop advanced coordination skills",
    "Short, focused practice with training modes is more effective than long sessions",
    "Try different tempo relationships between circles for added challenge"
  ];
  
  // Rotate tips every 6 seconds
  useEffect(() => {
    if (macroMode === 0 && speedMode === 0) return;
    
    const tipInterval = setInterval(() => {
      setTipIndex(prev => {
        const tipArray = macroMode !== 0 && isSilencePhase ? 
          silentPhaseTips : speedMode !== 0 ? 
          speedTrainingTips : generalTips;
          
        return (prev + 1) % tipArray.length;
      });
    }, 6000);
    
    return () => clearInterval(tipInterval);
  }, [macroMode, speedMode, isSilencePhase]);
  
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
  
  // Format measure text with improved information
  const formatMeasureText = (current, total) => {
    if (current === 0 && total === 0) return "Ready to start";
    if (current === 0) return `Starting ${total}-measure cycle`;
    
    const percentage = Math.round((current / total) * 100);
    return `Measure ${current} of ${total} (${percentage}% complete)`;
  };
  
  // Format countdown text with improved information
  const formatCountdownText = (remaining) => {
    if (remaining === 0) return "Increasing tempo now";
    if (remaining === 1) return "Tempo increases in 1 measure";
    return `Tempo increases in ${remaining} measures`;
  };
  
  // Get the current tip based on context
  const getCurrentTip = () => {
    if (macroMode !== 0 && isSilencePhase) {
      return silentPhaseTips[tipIndex % silentPhaseTips.length];
    } else if (speedMode !== 0) {
      return speedTrainingTips[tipIndex % speedTrainingTips.length];
    } else {
      return generalTips[tipIndex % generalTips.length];
    }
  };
  
  // Create beat indicators for visual rhythm pattern
  const renderBeatIndicators = (count, total) => {
    const indicators = [];
    for (let i = 0; i < total; i++) {
      indicators.push(
        <span 
          key={i} 
          className={`beat-indicator ${i < count ? 'active' : ''}`}
          aria-label={`Beat ${i+1} ${i < count ? 'completed' : 'upcoming'}`}
        />
      );
    }
    return <div className="beat-indicators">{indicators}</div>;
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
                    className="progress-bar animated" 
                    style={{width: `${muteProgress}%`}}
                    aria-valuenow={muteProgress}
                    aria-valuemin="0"
                    aria-valuemax="100"
                  ></div>
                </div>
                <span className="counter-text">
                  {muteMeasureCount === 0 ? 
                    "Starting silent phase" : 
                    `Silent measure ${muteMeasureCount} of ${muteDurationMeasures}`}
                </span>
                {muteDurationMeasures > 1 && renderBeatIndicators(muteMeasureCount, muteDurationMeasures)}
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
                    aria-valuenow={measureProgress}
                    aria-valuemin="0"
                    aria-valuemax="100"
                  ></div>
                </div>
                <span className="counter-text">
                  {formatMeasureText(measureCount, measuresUntilMute)}
                </span>
                {measuresUntilMute > 1 && renderBeatIndicators(measureCount, measuresUntilMute)}
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
                  <span className="status-label">Next Tempo Increase</span>
                  <div className="progress-container">
                    <div 
                      className="progress-bar" 
                      style={{
                        width: `${(currentMeasure / measuresUntilSpeedUp) * 100}%`
                      }}
                      aria-valuenow={(currentMeasure / measuresUntilSpeedUp) * 100}
                      aria-valuemin="0"
                      aria-valuemax="100"
                    ></div>
                  </div>
                  <span className="counter-text">
                    {formatCountdownText(remainingMeasures)}
                  </span>
                  {measuresUntilSpeedUp > 1 && renderBeatIndicators(currentMeasure, measuresUntilSpeedUp)}
                </>
              ) : (
                <>
                  <span className="status-label">Manual Speed Increase</span>
                  <span className="counter-text">
                    Press "Accelerate" to increase tempo by {tempoIncreasePercent}%
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      )}
      
      <div className="training-active-tip">
        <span className="tip-icon">💡</span>
        <div>
          <span className="tip-title">Multi-Circle Tip</span>
          <span className="tip-text">{getCurrentTip()}</span>
        </div>
      </div>
      
      {/* Keyboard shortcut hint - only show on desktop */}
      {!isMobile && (
        <div className="keyboard-hint">
          Press <kbd>R</kbd> to toggle training mode settings
        </div>
      )}
    </div>
  );
};

export default MultiCircleTrainingActiveContainer;