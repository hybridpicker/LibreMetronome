// src/components/metronome/BaseMetronomeLayout.js
import React, { useEffect, useState } from 'react';
import './BaseMetronomLayout.css';

export default function BaseMetronomeLayout({
  children,
  tempo, setTempo,
  volume, setVolume,
  swing, setSwing,
  isPaused, onTogglePlay, onTapTempo,
  showSwingSlider = true, useTapButtonMobile = true,
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
        <button className="play-pause-button" onClick={onTogglePlay}>
          <img src={isPaused ? '/assets/svg/play.svg' : '/assets/svg/pause.svg'} alt="Toggle Play" />
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
      <button 
        className="tap-button" 
        onClick={() => {
          console.log("[BASE LAYOUT] Tap tempo button clicked");
          if (logic && typeof logic.tapTempo === 'function') {
            logic.tapTempo();
          } else if (typeof onTapTempo === 'function') {
            console.log("[BASE LAYOUT] Using onTapTempo fallback");
            onTapTempo();
          } else {
            console.error("[BASE LAYOUT] No valid tap tempo function available", {logic, onTapTempo});
            // Dispatch global event for tap tempo as fallback
            const now = performance.now();
            console.log("[BASE LAYOUT] Using global event fallback");
            window.dispatchEvent(new CustomEvent('metronome-tap-tempo', {
              detail: { timestamp: now }
            }));
          }
        }}
      >
        <img src="/assets/svg/tap-button.svg" alt="Tap Tempo" />
      </button>
    </div>
  );
}