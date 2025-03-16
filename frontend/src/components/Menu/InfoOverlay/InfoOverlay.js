import React, { useState, useEffect } from 'react';
import './InfoOverlay.css';

// Updated Modal with responsive content for mobile and desktop
const InfoModal = ({ onClose }) => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 600);
  
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 600);
    };
    
    window.addEventListener('resize', handleResize);
    
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleResize);
    };
  }, [onClose]);

  // Responsive content based on device
  return (
    <div className="info-overlay" role="dialog" aria-modal="true">
      <div className="info-modal">
        <button 
          className="info-close-button" 
          onClick={onClose} 
          aria-label="Close Info Overlay"
        >
          &times;
        </button>
        
        {isMobile ? (
          // Mobile view - show mode descriptions
          <>
            <h2>Metronome Modes</h2>
            <ul>
              <li>
                <strong>Pendulum:</strong> Traditional pendulum metronome with a swinging arm visualization.
              </li>
              <li>
                <strong>Circle Mode:</strong> Modern circular visualization with customizable beats and accents.
              </li>
              <li>
                <strong>Grid Mode:</strong> Visual grid pattern for complex rhythms. Click columns to change accent patterns.
              </li>
              <li>
                <strong>Multi Circle:</strong> Advanced mode with multiple patterns for practicing complex rhythm changes.
              </li>
            </ul>
            <h3>Beat Types</h3>
            <ul>
              <li>
                <strong>Quarter Notes:</strong> Standard beat division.
              </li>
              <li>
                <strong>Eighth Notes:</strong> Twice as fast with subdivisions.
              </li>
            </ul>
            <p style={{ marginTop: "15px", fontSize: "13px", color: "#666" }}>
              Use the tap button to set tempo by tapping at your desired speed.
            </p>
          </>
        ) : (
          // Desktop view - show keyboard shortcuts
          <>
            <h2>Keyboard Shortcuts</h2>
            <ul>
              <li><strong>Space:</strong> Start/Pause</li>
              <li><strong>T:</strong> Tap tempo</li>
              <li><strong>1–9:</strong> Set Beats per Bar</li>
              <li><strong>Left/Right Arrows:</strong> Increase/Decrease tempo by 5 BPM</li>
              <li><strong>P:</strong> Switch to Pendulum</li>
              <li><strong>C:</strong> Switch to Circle Mode</li>
              <li><strong>G:</strong> Switch to Grid Mode</li>
              <li><strong>M:</strong> Switch to Multi Circle Mode</li>
              <li><strong>Enter:</strong> Manual tempo increase (in Training Mode)</li>
              <li><strong>I:</strong> Show Info Overlay</li>
              <li><strong>R:</strong> Show Training Mode</li>
              <li><strong>Esc:</strong> Close any open menu</li>
            </ul>
          </>
        )}
      </div>
    </div>
  );
};

// Info button that is always visible
const InfoButton = ({ onClick, active }) => (
  <button 
    className={`info-button ${active ? 'info-button-active' : ''}`} 
    onClick={onClick} 
    aria-label="Toggle Info Overlay"
  >
    Info
  </button>
);

// Main component that combines the button and modal
const InfoOverlay = ({ setActive }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isInfoButtonActive, setIsInfoButtonActive] = useState(false);

  const toggleOverlay = () => {
    setIsVisible((prev) => !prev);
    setIsInfoButtonActive((prev) => !prev);
    if (setActive) {
      setActive(!isInfoButtonActive);
    }
  };

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'I' || event.key === 'i') {
        setIsVisible((prev) => !prev);
        setIsInfoButtonActive((prev) => !prev);
      } else if (event.key === 'Escape') {
        setIsVisible(false);
        setIsInfoButtonActive(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <>
      <InfoButton onClick={toggleOverlay} active={isInfoButtonActive} />
      {isVisible && <InfoModal onClose={toggleOverlay} />}
    </>
  );
};

export default InfoOverlay;