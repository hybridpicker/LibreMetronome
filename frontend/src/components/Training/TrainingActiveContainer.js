// src/components/Training/TrainingActiveContainer.js
import React, { useState, useEffect } from 'react';
import './TrainingActiveContainer.css';
import useWindowDimensions from '../../hooks/useWindowDimensions';

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
  // State for rendering
  const [measureCount, setMeasureCount] = useState(0);
  const [muteMeasureCount, setMuteMeasureCount] = useState(0);
  const [isSilencePhase, setIsSilencePhase] = useState(false);
  const [, setForceUpdate] = useState(0);
  const [tipIndex, setTipIndex] = useState(0);
  
  // Check if device is mobile
  const { width } = useWindowDimensions();
  const isMobile = width <= 768;
  
  // Training tips array
  const silentPhaseTips = [
    "Focus on maintaining your internal tempo during silence",
    "Try counting out loud to stay on beat during the silent phase",
    "Imagine hearing the metronome in your head while it's silent",
    "Keep your movements consistent during both silent and playing phases",
    "If you lose the beat, don't worry - each attempt improves your timing"
  ];
  
  const speedTrainingTips = [
    "Maintain good technique as the tempo increases",
    "Keep your movements relaxed and efficient at higher speeds",
    "Focus on precision rather than just speed",
    "Start slow and build gradually for the best results",
    "If technique suffers at a higher tempo, return to a more comfortable speed"
  ];
  
  const generalTips = [
    "Use training mode regularly to improve your timing skills",
    "Combine macro-timing and speed training for comprehensive practice",
    "Track your progress by noting the tempos and settings you can handle",
    "Short, focused practice with training modes is more effective than long sessions",
    "Challenge yourself with new patterns and subdivisions as you improve"
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
      // Read values directly from refs
      if (measureCountRef?.current !== undefined) {
        setMeasureCount(measureCountRef.current);
      }
      
      if (muteMeasureCountRef?.current !== undefined) {
        setMuteMeasureCount(muteMeasureCountRef.current);
      }
      
      if (isSilencePhaseRef?.current !== undefined) {
        setIsSilencePhase(isSilencePhaseRef.current);
      }
      
      setForceUpdate(prev => prev + 1);
    };
    
    window.addEventListener('training-measure-update', handleMeasureUpdate);
    
    // Set up a regular polling interval as a fallback
    const pollInterval = setInterval(() => {
      handleMeasureUpdate();
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
          <span className="tip-title">Practice Tip</span>
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

export default TrainingActiveContainer;