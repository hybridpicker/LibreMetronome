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
  const [measureCount, setMeasureCount] = useState(0);
  const [muteMeasureCount, setMuteMeasureCount] = useState(0);
  const [isSilencePhase, setIsSilencePhase] = useState(false);
  const [windowSilencePhase, setWindowSilencePhase] = useState(false);
  
  // Update every 100ms to reflect the latest state
  useEffect(() => {
    if (!enabled) return;
    
    const timer = setInterval(() => {
      setTick(t => t + 1);
      
      // Read current values directly from refs
      if (measureCountRef?.current !== undefined) {
        setMeasureCount(measureCountRef.current);
      }
      
      if (muteMeasureCountRef?.current !== undefined) {
        setMuteMeasureCount(muteMeasureCountRef.current);
      }
      
      if (isSilencePhaseRef?.current !== undefined) {
        setIsSilencePhase(isSilencePhaseRef.current);
      }
      
      // Also check global reference
      if (typeof window !== 'undefined' && window.isSilencePhaseRef) {
        setWindowSilencePhase(window.isSilencePhaseRef.current);
      }
    }, 100);
    
    return () => clearInterval(timer);
  }, [enabled, measureCountRef, muteMeasureCountRef, isSilencePhaseRef]);
  
  // Event listener for training-measure-update events
  useEffect(() => {
    if (!enabled) return;
    
    const handleMeasureUpdate = () => {
      if (measureCountRef?.current !== undefined) {
        setMeasureCount(measureCountRef.current);
      }
      
      if (muteMeasureCountRef?.current !== undefined) {
        setMuteMeasureCount(muteMeasureCountRef.current);
      }
      
      if (isSilencePhaseRef?.current !== undefined) {
        setIsSilencePhase(isSilencePhaseRef.current);
      }
      
      // Also check global reference
      if (typeof window !== 'undefined' && window.isSilencePhaseRef) {
        setWindowSilencePhase(window.isSilencePhaseRef.current);
      }
    };
    
    window.addEventListener('training-measure-update', handleMeasureUpdate);
    return () => window.removeEventListener('training-measure-update', handleMeasureUpdate);
  }, [enabled, measureCountRef, muteMeasureCountRef, isSilencePhaseRef]);
  
  if (!enabled) return null;
  
  return (
    <div style={{
      position: 'fixed',
      bottom: '10px',
      right: '10px',
      backgroundColor: 'rgba(0,0,0,0.85)',
      color: 'white',
      padding: '12px',
      borderRadius: '6px',
      fontSize: '12px',
      fontFamily: 'monospace',
      zIndex: 9999,
      maxWidth: '350px',
      maxHeight: '70vh',
      overflow: 'auto',
      boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
      border: '1px solid rgba(255,255,255,0.1)',
      backdropFilter: 'blur(4px)'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '8px',
        paddingBottom: '6px',
        borderBottom: '1px solid rgba(255,255,255,0.2)'
      }}>
        <h4 style={{ margin: '0', color: 'var(--primary-teal)', fontSize: '14px' }}>Training Debug</h4>
        <span style={{ 
          color: macroMode !== 0 || speedMode !== 0 ? 'var(--primary-teal)' : 'var(--error)',
          fontSize: '11px',
          padding: '2px 6px',
          background: 'rgba(255,255,255,0.1)',
          borderRadius: '4px'
        }}>
          {macroMode !== 0 || speedMode !== 0 ? 'ACTIVE' : 'INACTIVE'}
        </span>
      </div>
      
      <div style={{ marginBottom: '8px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            <tr>
              <td style={{ padding: '3px 0', color: '#aaa' }}>Macro Mode:</td>
              <td style={{ padding: '3px 0', textAlign: 'right' }}>
                <span style={{ 
                  background: macroMode !== 0 ? 'rgba(0, 160, 160, 0.2)' : 'rgba(255,255,255,0.1)',
                  padding: '2px 6px',
                  borderRadius: '3px',
                  color: macroMode !== 0 ? 'var(--primary-teal)' : '#aaa'
                }}>
                  {macroMode === 0 ? 'OFF' : macroMode === 1 ? 'FIXED' : 'RANDOM'}
                </span>
              </td>
            </tr>
            <tr>
              <td style={{ padding: '3px 0', color: '#aaa' }}>Speed Mode:</td>
              <td style={{ padding: '3px 0', textAlign: 'right' }}>
                <span style={{ 
                  background: speedMode !== 0 ? 'rgba(248, 211, 141, 0.2)' : 'rgba(255,255,255,0.1)',
                  padding: '2px 6px',
                  borderRadius: '3px',
                  color: speedMode !== 0 ? 'var(--secondary-gold-dark)' : '#aaa'
                }}>
                  {speedMode === 0 ? 'OFF' : speedMode === 1 ? 'AUTO' : 'MANUAL'}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <div style={{ marginBottom: '10px', padding: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }}>
        <div style={{ marginBottom: '5px', fontSize: '11px', color: '#ccc', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '3px' }}>
          Silence State
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
          <span style={{ color: '#aaa', fontSize: '11px' }}>Local Silence:</span>
          <span style={{ 
            fontWeight: 'bold', 
            color: isSilencePhase ? 'var(--error)' : 'var(--success)'
          }}>
            {String(isSilencePhase)}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#aaa', fontSize: '11px' }}>Global Silence:</span>
          <span style={{ 
            fontWeight: 'bold', 
            color: windowSilencePhase ? 'var(--error)' : 'var(--success)'
          }}>
            {String(windowSilencePhase)}
          </span>
        </div>
        {isSilencePhase !== windowSilencePhase && (
          <div style={{ 
            marginTop: '5px', 
            padding: '3px 5px', 
            background: 'rgba(244, 67, 54, 0.2)', 
            borderRadius: '3px',
            fontSize: '10px',
            color: 'var(--error)'
          }}>
            WARNING: Mismatch between local and global silence state!
          </div>
        )}
      </div>
      
      <div style={{ marginBottom: '10px', padding: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }}>
        <div style={{ marginBottom: '5px', fontSize: '11px', color: '#ccc', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '3px' }}>
          Measure Counters
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
          <span style={{ color: '#aaa', fontSize: '11px' }}>Play Measure:</span>
          <code style={{ 
            background: 'rgba(255,255,255,0.1)', 
            padding: '1px 4px', 
            borderRadius: '3px'
          }}>
            {measureCount} / {measuresUntilMute}
          </code>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#aaa', fontSize: '11px' }}>Silence Measure:</span>
          <code style={{ 
            background: 'rgba(255,255,255,0.1)', 
            padding: '1px 4px', 
            borderRadius: '3px'
          }}>
            {muteMeasureCount} / {muteDurationMeasures}
          </code>
        </div>
      </div>
      
      <div style={{ marginBottom: '10px', padding: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }}>
        <div style={{ marginBottom: '5px', fontSize: '11px', color: '#ccc', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '3px' }}>
          Speed Training
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
          <span style={{ color: '#aaa', fontSize: '11px' }}>Increase:</span>
          <code style={{ 
            background: 'rgba(255,255,255,0.1)', 
            padding: '1px 4px', 
            borderRadius: '3px',
            color: 'var(--secondary-gold)'
          }}>
            {tempoIncreasePercent}%
          </code>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#aaa', fontSize: '11px' }}>Measures Until Speed:</span>
          <code style={{ 
            background: 'rgba(255,255,255,0.1)', 
            padding: '1px 4px', 
            borderRadius: '3px'
          }}>
            {measuresUntilSpeedUp}
          </code>
        </div>
      </div>
      
      <div style={{ fontSize: '10px', color: '#999', marginTop: '8px', textAlign: 'right' }}>
        Refresh: {tick} | Last update: {new Date().toLocaleTimeString()}
      </div>
    </div>
  );
};

export default TrainingDebugHelper;