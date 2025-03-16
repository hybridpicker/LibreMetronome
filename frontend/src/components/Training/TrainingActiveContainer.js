// src/components/Training/TrainingActiveContainer.js
import React, { useState, useEffect } from 'react';
import './TrainingActiveContainer.css';
import useWindowDimensions from '../../hooks/useWindowDimensions';

const TrainingActiveContainer = ({
  macroMode,
  speedMode,
  isSilencePhaseRef,
  measureCountRef,
  measuresUntilMute,
  muteMeasureCountRef,
  muteDurationMeasures,
  tempoIncreasePercent,
  measuresUntilSpeedUp,
  isPaused,
  forceUpdate // Add forceUpdate prop
}) => {
  // State for tracking current values
  const [measureCount, setMeasureCount] = useState(0);
  const [muteMeasureCount, setMuteMeasureCount] = useState(0);
  const [isSilencePhase, setIsSilencePhase] = useState(false);
  
  // State for editing parameters
  const [editingParam, setEditingParam] = useState(null);
  const [editValue, setEditValue] = useState('');
  
  // Check if device is mobile
  const { width } = useWindowDimensions();
  const isMobile = width <= 768;
  

  // Update local state from refs - this is crucial to ensure UI updates
  useEffect(() => {
    // Don't update state when paused to prevent flickering
    if (isPaused) {
      return;
    }
    
    const updateFromRefs = () => {
      // Directly access global ref if available
      const globalSilenceRef = window.isSilencePhaseRef;
      
      if (globalSilenceRef?.current !== undefined) {
        setIsSilencePhase(globalSilenceRef.current);
      } else if (isSilencePhaseRef?.current !== undefined) {
        setIsSilencePhase(isSilencePhaseRef.current);
      }
      
      if (measureCountRef?.current !== undefined) {
        setMeasureCount(measureCountRef.current);
      }
      
      if (muteMeasureCountRef?.current !== undefined) {
        setMuteMeasureCount(muteMeasureCountRef.current);
      }
    };
    
    // Update immediately when not paused
    updateFromRefs();
    
    // Listen for each beat (including silent ones)
    const handleBeat = (event) => {
      // Skip updates when paused
      if (isPaused) return;
      
      if (event.detail?.isSilencePhase !== undefined) {
        setIsSilencePhase(event.detail.isSilencePhase);
      } else {
        updateFromRefs();
      }
    };
    
    // Listen for measure boundary events
    const handleMeasureBoundary = (event) => {
      // Skip updates when paused
      if (isPaused) return;
      
      if (event.detail?.isSilencePhase !== undefined) {
        setIsSilencePhase(event.detail.isSilencePhase);
      }
      if (event.detail?.measureCount !== undefined) {
        setMeasureCount(event.detail.measureCount);
      }
      if (event.detail?.muteMeasureCount !== undefined) {
        setMuteMeasureCount(event.detail.muteMeasureCount);
      }
    };
    
    // Listen for training state events
    const handleTrainingStateChange = (event) => {
      // Skip updates when paused
      if (isPaused) return;
      
      if (event.detail?.silencePhase !== undefined) {
        setIsSilencePhase(event.detail.silencePhase);
      } else {
        updateFromRefs();
      }
    };
    
    // Add event listeners with high priority
    window.addEventListener('metronome-beat', handleBeat);
    window.addEventListener('metronome-measure-boundary', handleMeasureBoundary);
    window.addEventListener('silent-beat-played', handleBeat);
    window.addEventListener('training-measure-update', handleTrainingStateChange);
    document.addEventListener('training-state-changed', handleTrainingStateChange);
    window.addEventListener('force-training-update', updateFromRefs);
    
    // Set up less frequent interval when not paused
    const interval = setInterval(updateFromRefs, 250);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('metronome-beat', handleBeat);
      window.removeEventListener('metronome-measure-boundary', handleMeasureBoundary);
      window.removeEventListener('silent-beat-played', handleBeat);
      window.removeEventListener('training-measure-update', handleTrainingStateChange);
      document.removeEventListener('training-state-changed', handleTrainingStateChange);
      window.removeEventListener('force-training-update', updateFromRefs);
    };
  }, [isSilencePhaseRef, measureCountRef, muteMeasureCountRef, isPaused]);

  // React to forceUpdate changes
  useEffect(() => {
    if (forceUpdate !== undefined) {
      if (isSilencePhaseRef?.current !== undefined) {
        setIsSilencePhase(isSilencePhaseRef.current);
      }
      
      if (measureCountRef?.current !== undefined) {
        setMeasureCount(measureCountRef.current);
      }
      
      if (muteMeasureCountRef?.current !== undefined) {
        setMuteMeasureCount(muteMeasureCountRef.current);
      }
    }
  }, [forceUpdate, isSilencePhaseRef, measureCountRef, muteMeasureCountRef]);

  // Reset local state when training mode is turned off
  useEffect(() => {
    if (macroMode === 0 && speedMode === 0) {
      setMeasureCount(0);
      setMuteMeasureCount(0);
      setIsSilencePhase(false);
    }
  }, [macroMode, speedMode]);
  

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
            <span 
              className="training-active-section-type clickable"
              onClick={() => {
                // Toggle between macroMode 1 (Fixed) and 2 (Random)
                const event = new CustomEvent('training-mode-toggle', {
                  detail: { 
                    type: 'macroMode', 
                    newValue: macroMode === 1 ? 2 : 1 
                  }
                });
                window.dispatchEvent(event);
              }}
            >
              {macroMode === 1 ? 'Fixed Silence' : 'Random Silence'}
            </span>
          </div>
          
          <div className="training-active-status-box training">
            <div className="status-icon">🎵</div>
            <div className="status-info">
              <span className="status-label">Training Active</span>
              {editingParam === 'measuresUntilMute' ? (
                <div className="parameter-edit">
                  <div className="parameter-edit-header">Play Phase Duration</div>
                  <div className="parameter-edit-controls">
                    <input
                      type="number"
                      min="1"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const newValue = parseInt(editValue, 10);
                          if (!isNaN(newValue) && newValue > 0) {
                            const event = new CustomEvent('training-param-update', {
                              detail: { type: 'measuresUntilMute', newValue }
                            });
                            window.dispatchEvent(event);
                            setEditingParam(null);
                          }
                        } else if (e.key === 'Escape') {
                          setEditingParam(null);
                        }
                      }}
                      autoFocus
                    />
                    <span>measures</span>
                  </div>
                  <div className="parameter-edit-hint">Press Enter to save or Esc to cancel</div>
                  <div className="parameter-edit-buttons">
                    <button 
                      className="parameter-edit-button parameter-edit-save"
                      onClick={() => {
                        const newValue = parseInt(editValue, 10);
                        if (!isNaN(newValue) && newValue > 0) {
                          const event = new CustomEvent('training-param-update', {
                            detail: { type: 'measuresUntilMute', newValue }
                          });
                          window.dispatchEvent(event);
                          setEditingParam(null);
                        }
                      }}
                    >
                      Save
                    </button>
                    <button 
                      className="parameter-edit-button parameter-edit-cancel"
                      onClick={() => setEditingParam(null)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : editingParam === 'muteDurationMeasures' ? (
                <div className="parameter-edit">
                  <div className="parameter-edit-header">Silent Phase Duration</div>
                  <div className="parameter-edit-controls">
                    <input
                      type="number"
                      min="1"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const newValue = parseInt(editValue, 10);
                          if (!isNaN(newValue) && newValue > 0) {
                            const event = new CustomEvent('training-param-update', {
                              detail: { type: 'muteDurationMeasures', newValue }
                            });
                            window.dispatchEvent(event);
                            setEditingParam(null);
                          }
                        } else if (e.key === 'Escape') {
                          setEditingParam(null);
                        }
                      }}
                      autoFocus
                    />
                    <span>measures</span>
                  </div>
                  <div className="parameter-edit-hint">Press Enter to save or Esc to cancel</div>
                  <div className="parameter-edit-buttons">
                    <button 
                      className="parameter-edit-button parameter-edit-save"
                      onClick={() => {
                        const newValue = parseInt(editValue, 10);
                        if (!isNaN(newValue) && newValue > 0) {
                          const event = new CustomEvent('training-param-update', {
                            detail: { type: 'muteDurationMeasures', newValue }
                          });
                          window.dispatchEvent(event);
                          setEditingParam(null);
                        }
                      }}
                    >
                      Save
                    </button>
                    <button 
                      className="parameter-edit-button parameter-edit-cancel"
                      onClick={() => setEditingParam(null)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <span className="counter-text">
                  <span 
                    className="editable-param" 
                    onClick={() => {
                      setEditingParam('measuresUntilMute');
                      setEditValue(measuresUntilMute.toString());
                    }}
                  >
                    Play: {measuresUntilMute} measures
                  </span>, 
                  <span 
                    className="editable-param"
                    onClick={() => {
                      setEditingParam('muteDurationMeasures');
                      setEditValue(muteDurationMeasures.toString());
                    }}
                  >
                    Silent: {muteDurationMeasures} measures
                  </span>
                </span>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Speed Training Status */}
      {speedMode !== 0 && (
        <div className="training-active-section">
          <div className="training-active-section-header">
            <span className="training-active-section-title">Speed Training</span>
            <span 
              className="training-active-section-type clickable"
              onClick={() => {
                // Toggle between speedMode 1 (Auto) and 2 (Manual)
                const event = new CustomEvent('training-mode-toggle', {
                  detail: { 
                    type: 'speedMode', 
                    newValue: speedMode === 1 ? 2 : 1 
                  }
                });
                window.dispatchEvent(event);
              }}
            >
              {speedMode === 1 ? 'Auto Increase' : 'Manual Increase'}
            </span>
          </div>
          
          <div className="training-active-status-box speed">
            <div className="status-icon">⏱️</div>
            <div className="status-info">
              {editingParam === 'measuresUntilSpeedUp' ? (
                <div className="parameter-edit">
                  <div className="parameter-edit-header">Measures Between Tempo Increases</div>
                  <div className="parameter-edit-controls">
                    <input
                      type="number"
                      min="1"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const newValue = parseInt(editValue, 10);
                          if (!isNaN(newValue) && newValue > 0) {
                            const event = new CustomEvent('training-param-update', {
                              detail: { type: 'measuresUntilSpeedUp', newValue }
                            });
                            window.dispatchEvent(event);
                            setEditingParam(null);
                          }
                        } else if (e.key === 'Escape') {
                          setEditingParam(null);
                        }
                      }}
                      autoFocus
                    />
                    <span>measures</span>
                  </div>
                  <div className="parameter-edit-hint">Press Enter to save or Esc to cancel</div>
                  <div className="parameter-edit-buttons">
                    <button 
                      className="parameter-edit-button parameter-edit-save"
                      onClick={() => {
                        const newValue = parseInt(editValue, 10);
                        if (!isNaN(newValue) && newValue > 0) {
                          const event = new CustomEvent('training-param-update', {
                            detail: { type: 'measuresUntilSpeedUp', newValue }
                          });
                          window.dispatchEvent(event);
                          setEditingParam(null);
                        }
                      }}
                    >
                      Save
                    </button>
                    <button 
                      className="parameter-edit-button parameter-edit-cancel"
                      onClick={() => setEditingParam(null)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : editingParam === 'tempoIncreasePercent' ? (
                <div className="parameter-edit">
                  <div className="parameter-edit-header">Tempo Increase Amount</div>
                  <div className="parameter-edit-controls">
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const newValue = parseInt(editValue, 10);
                          if (!isNaN(newValue) && newValue > 0 && newValue <= 20) {
                            const event = new CustomEvent('training-param-update', {
                              detail: { type: 'tempoIncreasePercent', newValue }
                            });
                            window.dispatchEvent(event);
                            setEditingParam(null);
                          }
                        } else if (e.key === 'Escape') {
                          setEditingParam(null);
                        }
                      }}
                      autoFocus
                    />
                    <span>percent</span>
                  </div>
                  <div className="parameter-edit-hint">Press Enter to save or Esc to cancel</div>
                  <div className="parameter-edit-buttons">
                    <button 
                      className="parameter-edit-button parameter-edit-save"
                      onClick={() => {
                        const newValue = parseInt(editValue, 10);
                        if (!isNaN(newValue) && newValue > 0 && newValue <= 20) {
                          const event = new CustomEvent('training-param-update', {
                            detail: { type: 'tempoIncreasePercent', newValue }
                          });
                          window.dispatchEvent(event);
                          setEditingParam(null);
                        }
                      }}
                    >
                      Save
                    </button>
                    <button 
                      className="parameter-edit-button parameter-edit-cancel"
                      onClick={() => setEditingParam(null)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : speedMode === 1 ? (
                <>
                  <span className="status-label">Auto Speed Increase</span>
                  <span className="counter-text">
                    <span 
                      className="editable-param" 
                      onClick={() => {
                        setEditingParam('measuresUntilSpeedUp');
                        setEditValue(measuresUntilSpeedUp.toString());
                      }}
                    >
                      Every {measuresUntilSpeedUp} measures
                    </span>, tempo increases by 
                    <span 
                      className="editable-param"
                      onClick={() => {
                        setEditingParam('tempoIncreasePercent');
                        setEditValue(tempoIncreasePercent.toString());
                      }}
                    >
                      {tempoIncreasePercent}%
                    </span>
                  </span>
                </>
              ) : (
                <>
                  <span className="status-label">Manual Speed Increase</span>
                  <span className="counter-text">
                    Press "Accelerate" to increase tempo by 
                    <span 
                      className="editable-param"
                      onClick={() => {
                        setEditingParam('tempoIncreasePercent');
                        setEditValue(tempoIncreasePercent.toString());
                      }}
                    >
                      {" " + tempoIncreasePercent}%
                    </span>
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      )}
      
      
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