// src/components/metronome/BaseMetronomeLayout.js
import React, { useEffect, useState } from 'react';
import './BaseMetronomLayout.css';

export default function BaseMetronomeLayout({
  children,
  tempo, setTempo,
  volume, setVolume,
  swing, setSwing,
  isPaused, onTogglePlay, onTapTempo,
  showSwingSlider = true, 
  useTapButton = true, // Changed from useTapButtonMobile to always show it
  logic, // Add logic prop for direct reference to metronome logic
}) {
  const [containerSize, setContainerSize] = useState(300);

  useEffect(() => {
    function handleResize() {
      const w = window.innerWidth;
      setContainerSize(w < 600 ? Math.min(w - 40, 300) : w < 1024 ? Math.min(w - 40, 400) : 300);
    }
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="metronome-layout">
      <div className="metronome-container" style={{ width: containerSize, height: containerSize }}>
        {typeof children === 'function' ? children(containerSize) : children}
        <button className="play-pause-button" onClick={onTogglePlay} aria-label={isPaused ? "Play metronome" : "Pause metronome"}>
          <img 
            src={isPaused ? require('../../assets/svg/play.svg').default : require('../../assets/svg/pause.svg').default} 
            alt={isPaused ? "Play" : "Pause"} 
            className="play-pause-icon"
          />
        </button>
      </div>
      
      {/* Tap Tempo Button - Always visible and positioned directly under play/pause */}
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '5px', marginBottom: '15px' }}>
        <button 
          className="tap-button" 
          onClick={() => {
            console.log("[BASE LAYOUT] Tap tempo button clicked");
            let handled = false;
            
            // Try using the metronome logic directly
            if (logic && typeof logic.tapTempo === 'function') {
              console.log("[BASE LAYOUT] Using logic.tapTempo");
              logic.tapTempo();
              handled = true;
            } 
            // Try using the callback from the parent component
            else if (typeof onTapTempo === 'function') {
              console.log("[BASE LAYOUT] Using onTapTempo callback");
              onTapTempo();
              handled = true;
            }
            
            // Always dispatch the global event for the App-level handler
            const now = performance.now();
            console.log("[BASE LAYOUT] Dispatching global tap tempo event");
            window.dispatchEvent(new CustomEvent('metronome-tap-tempo', {
              detail: { timestamp: now, handled }
            }));
          }}
        >
          <img 
            src={require('../../assets/svg/tap-button.svg').default} 
            alt="Tap Tempo" 
            className="tap-icon"
          />
        </button>
      </div>
      
      <div className="sliders-container">
        <label>
          Tempo: {tempo} BPM
          <input type="range" min={15} max={240} step={1} value={tempo} onChange={(e) => setTempo(Number(e.target.value))} />
        </label>
        <label>
          Volume: {Math.round(volume * 100)}%
          <input type="range" min={0} max={1} step={0.01} value={volume} onChange={(e) => setVolume(Number(e.target.value))} />
        </label>
        {showSwingSlider && (
          <label>
            Swing: {Math.round(swing * 200)}%
            <input type="range" min={0} max={0.5} step={0.01} value={swing} onChange={(e) => setSwing(Number(e.target.value))} />
          </label>
        )}
      </div>
    </div>
  );
}