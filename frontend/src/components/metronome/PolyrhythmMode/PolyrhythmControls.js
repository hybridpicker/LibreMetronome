// src/components/metronome/PolyrhythmMode/PolyrhythmControls.js
import React from 'react';

const PolyrhythmControls = ({
  innerBeats,
  outerBeats,
  setInnerBeats,
  setOuterBeats,
  isTransitioning,
  handleSwitchCircles
}) => {
  // Beat options arranged in order of display for 4x2 grid
  const beatOptions = [2, 3, 4, 5, 6, 7, 8, 9];

  return (
    <div className="polyrhythm-controls">
      {/* Top section: Inner Circle + Side Controls */}
      <div className="top-section">
        {/* Inner Circle Controls */}
        <div className="polyrhythm-config">
          <h4 className="polyrhythm-section-title">Inner Circle: {innerBeats} beats</h4>
          <div className="polyrhythm-buttons">
            {beatOptions.map(num => (
              <button
                key={`inner-${num}`}
                className={`polyrhythm-button ${innerBeats === num ? 'active' : ''}`}
                onClick={() => setInnerBeats(num)}
                disabled={isTransitioning}
                aria-label={`Set inner circle to ${num} beats`}
              >
                {num}
                {innerBeats === num && (
                  <span className="sr-only">(Selected)</span>
                )}
              </button>
            ))}
          </div>
        </div>
        
        {/* Side Controls for Polyrhythm and Swap */}
        <div className="side-controls">
          <div className="polyrhythm-ratio">
            <h3>Polyrhythm: <span className="ratio-value">{innerBeats}:{outerBeats}</span></h3>
          </div>
          
          <button
            onClick={handleSwitchCircles}
            className="switch-circles-button"
            disabled={isTransitioning}
            aria-label="Swap Inner and Outer Beat Patterns"
            style={{
              opacity: isTransitioning ? 0.6 : 1,
              cursor: isTransitioning ? 'not-allowed' : 'pointer'
            }}
          >
            <span>Swap</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M7 16L3 12M3 12L7 8M3 12H16M17 8L21 12M21 12L17 16M21 12H8" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>
      
      {/* Bottom section: Outer Circle Controls */}
      <div className="polyrhythm-config">
        <h4 className="polyrhythm-section-title">Outer Circle: {outerBeats} beats</h4>
        <div className="polyrhythm-buttons">
          {beatOptions.map(num => (
            <button
              key={`outer-${num}`}
              className={`polyrhythm-button ${outerBeats === num ? 'active' : ''}`}
              onClick={() => setOuterBeats(num)}
              disabled={isTransitioning}
              aria-label={`Set outer circle to ${num} beats`}
            >
              {num}
              {outerBeats === num && (
                <span className="sr-only">(Selected)</span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PolyrhythmControls;