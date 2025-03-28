// src/tests/ManualTapTempoTest.js
import React, { useState, useEffect } from 'react';

/**
 * A simple component to manually test tap tempo functionality.
 * This can be temporarily imported and rendered in App.js as:
 * 
 * import ManualTapTempoTest from './tests/ManualTapTempoTest';
 * 
 * Then add <ManualTapTempoTest /> at the top of your main component.
 */
const ManualTapTempoTest = () => {
  const [taps, setTaps] = useState([]);
  const [lastTapSource, setLastTapSource] = useState('None');
  const [calculatedTempo, setCalculatedTempo] = useState(0);
  
  // Listen for keyboard taps
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.code === 'KeyT') {
        recordTap('Keyboard T');
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
  
  // Listen for global tempo events
  useEffect(() => {
    const handleTempoEvent = (event) => {
      setCalculatedTempo(event.detail.tempo);
    };
    
    window.addEventListener('metronome-set-tempo', handleTempoEvent);
    return () => window.removeEventListener('metronome-set-tempo', handleTempoEvent);
  }, []);
  
  // Function to record a tap from any source
  const recordTap = (source) => {
    const now = performance.now();
    setTaps(prev => [...prev.slice(-9), now]);
    setLastTapSource(source);
    
    // Calculate and show tempo if we have enough taps
    if (taps.length > 0) {
      const intervals = [];
      for (let i = 1; i < taps.length; i++) {
        intervals.push(taps[i] - taps[i-1]);
      }
      
      if (intervals.length > 0) {
        const avgInterval = intervals.reduce((sum, val) => sum + val, 0) / intervals.length;
        const tempo = Math.round(60000 / avgInterval);
        // We don't set the tempo here as we're just monitoring the system.
        console.log(`Calculated tempo: ${tempo} BPM`);
      }
    }
  };
  
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      zIndex: 9999,
      background: 'rgba(0, 0, 0, 0.8)',
      color: 'white',
      padding: '10px',
      fontSize: '14px',
      maxWidth: '300px',
      fontFamily: 'monospace',
      borderRadius: '0 0 10px 0'
    }}>
      <h3 style={{ margin: '0 0 8px 0' }}>Tap Tempo Test Monitor</h3>
      <button 
        onClick={() => recordTap('Test Button')}
        style={{
          padding: '5px 10px',
          marginBottom: '8px',
          background: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        Test Tap
      </button>
      <div>Last tap source: <strong>{lastTapSource}</strong></div>
      <div>Calculated tempo: <strong>{calculatedTempo}</strong> BPM</div>
      <div>Recent taps: {taps.length}</div>
      <button
        onClick={() => setTaps([])}
        style={{
          padding: '3px 8px',
          marginTop: '8px',
          background: '#dc3545',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '12px'
        }}
      >
        Reset Taps
      </button>
    </div>
  );
};

export default ManualTapTempoTest;
