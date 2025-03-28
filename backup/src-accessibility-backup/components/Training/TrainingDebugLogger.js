// src/components/Training/TrainingDebugLogger.js
// A utility component to help debug training container issues

import React, { useEffect, useState } from 'react';

/**
 * This component adds a floating debug panel to help diagnose 
 * training container issues across different metronome modes.
 * 
 * Add this component to your App.js to see training state in all modes:
 * 
 * import TrainingDebugLogger from './components/Training/TrainingDebugLogger';
 * 
 * // Then in your render function:
 * <TrainingDebugLogger />
 */
const TrainingDebugLogger = () => {
  const [logs, setLogs] = useState([]);
  const [state, setState] = useState({
    isSilencePhase: false,
    measureCount: 0,
    muteCount: 0,
    macroMode: 0,
    speedMode: 0,
    lastUpdate: Date.now()
  });
  const [expandedMode, setExpandedMode] = useState(false);

  // Monitor global state
  useEffect(() => {
    const checkGlobalState = () => {
      // Check global refs
      const globalSilenceRef = window.isSilencePhaseRef;
      const silencePhase = globalSilenceRef?.current;
      
      // Find training containers
      const trainingContainers = document.querySelectorAll('.training-active-container');
      const containerCount = trainingContainers.length;
      
      // Check which metronome mode is active
      const modes = {
        analog: !!document.querySelector('.analog-metronome-container'),
        circle: !!document.querySelector('.metronome-container:not(.analog-metronome-container)'),
        grid: !!document.querySelector('.grid-metronome-container'),
        multi: !!document.querySelector('.multi-circle-container')
      };
      
      // Find active mode
      let activeMode = 'unknown';
      Object.entries(modes).forEach(([mode, isActive]) => {
        if (isActive) activeMode = mode;
      });
      
      // Get training settings from UI if possible
      let macroMode = 0;
      let speedMode = 0;
      
      const statusBox = document.querySelector('.training-active-section-type');
      if (statusBox) {
        if (statusBox.textContent.includes('Fixed Silence')) {
          macroMode = 1;
        } else if (statusBox.textContent.includes('Random Silence')) {
          macroMode = 2;
        }
        
        const speedStatusBox = document.querySelectorAll('.training-active-section-type')[1];
        if (speedStatusBox) {
          if (speedStatusBox.textContent.includes('Auto Increase')) {
            speedMode = 1;
          } else if (speedStatusBox.textContent.includes('Manual Increase')) {
            speedMode = 2;
          }
        }
      }
      
      // Update state
      const newState = {
        isSilencePhase: !!silencePhase,
        containerCount,
        activeMode,
        macroMode,
        speedMode,
        lastUpdate: Date.now()
      };
      
      // Only log if something changed
      if (JSON.stringify(newState) !== JSON.stringify(state)) {
        setState(newState);
        
        // Add to logs
        setLogs(prev => {
          const newLogs = [
            ...prev,
            {
              time: new Date().toLocaleTimeString(),
              ...newState
            }
          ];
          
          // Keep only last 20 logs
          return newLogs.slice(-20);
        });
      }
    };
    
    // Check immediately
    checkGlobalState();
    
    // Set up polling
    const interval = setInterval(checkGlobalState, 1000);
    
    // Listen for training events
    const handleTrainingUpdate = (e) => {
      setLogs(prev => [
        ...prev,
        {
          time: new Date().toLocaleTimeString(),
          type: 'event',
          name: e.type,
          detail: e.detail || '(no detail)'
        }
      ].slice(-20));
    };
    
    window.addEventListener('training-measure-update', handleTrainingUpdate);
    document.addEventListener('training-state-changed', handleTrainingUpdate);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('training-measure-update', handleTrainingUpdate);
      document.removeEventListener('training-state-changed', handleTrainingUpdate);
    };
  }, [state]);

  // Don't render in production
  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  return (
    <div 
      style={{
        position: 'fixed',
        bottom: '10px',
        right: '10px',
        zIndex: 9999,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        color: 'white',
        padding: '10px',
        borderRadius: '5px',
        maxWidth: expandedMode ? '500px' : '300px',
        maxHeight: expandedMode ? '500px' : '200px',
        overflow: 'auto',
        fontSize: '12px',
        fontFamily: 'monospace',
        opacity: 0.8,
        transition: 'all 0.3s ease'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
        <h3 style={{ margin: 0, fontSize: '14px' }}>Training Debug</h3>
        <button onClick={() => setExpandedMode(!expandedMode)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>
          {expandedMode ? '▼' : '▲'}
        </button>
      </div>
      
      <div style={{ marginBottom: '10px' }}>
        <div><strong>Mode:</strong> {state.activeMode}</div>
        <div><strong>Silence:</strong> {state.isSilencePhase ? '🔇 ON' : '🔊 OFF'}</div>
        <div><strong>Training:</strong> Macro={state.macroMode}, Speed={state.speedMode}</div>
        <div><strong>Containers:</strong> {state.containerCount || 0}</div>
      </div>
      
      {expandedMode && (
        <div>
          <h4 style={{ margin: '5px 0', borderBottom: '1px solid #666' }}>Event Log</h4>
          {logs.map((log, idx) => (
            <div key={idx} style={{ 
              fontSize: '10px',
              marginBottom: '3px',
              padding: '2px',
              backgroundColor: log.type === 'event' ? 'rgba(255, 255, 0, 0.1)' : 'transparent'
            }}>
              <span style={{ color: '#999' }}>{log.time}</span> 
              {log.type === 'event' ? (
                <span> Event: <strong>{log.name}</strong></span>
              ) : (
                <span> {log.isSilencePhase ? '🔇' : '🔊'} Mode: {log.activeMode}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TrainingDebugLogger;