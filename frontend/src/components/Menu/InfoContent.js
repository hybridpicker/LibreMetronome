// src/components/Menu/InfoContent.js
import React, { useState, useEffect } from 'react';

const InfoContent = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 600);
  
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 600);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="info-content">
      <h2>LibreMetronome</h2>
      
      {isMobile ? (
        // Mobile view - show mode descriptions
        <>
          <h3>Metronome Modes</h3>
          <ul>
            <li>
              <strong>Analog Mode:</strong> Traditional pendulum metronome with a swinging arm visualization.
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
          <h3>Keyboard Shortcuts</h3>
          <ul className="shortcut-list">
            <li><span className="key">Space</span> Start/Pause</li>
            <li><span className="key">T</span> Tap tempo</li>
            <li><span className="key">1–9</span> Set Beats per Bar</li>
            <li><span className="key">←/→</span> Decrease/Increase tempo by 5 BPM</li>
            <li><span className="key">A</span> Switch to Analog Mode</li>
            <li><span className="key">C</span> Switch to Circle Mode</li>
            <li><span className="key">G</span> Switch to Grid Mode</li>
            <li><span className="key">M</span> Switch to Multi Circle Mode</li>
            <li><span className="key">U</span> Manual tempo increase</li>
            <li><span className="key">I</span> Show Menu (Info tab)</li>
            <li><span className="key">T</span> Show Menu (Training tab)</li>
            <li><span className="key">S</span> Show Menu (Settings tab)</li>
            <li><span className="key">Esc</span> Close the menu</li>
          </ul>
          
          <h3>Beat Types</h3>
          <div className="beat-types">
            <div className="beat-type">
              <div className="beat-indicator muted"></div>
              <span>Muted Beat</span>
            </div>
            <div className="beat-type">
              <div className="beat-indicator normal"></div>
              <span>Normal Beat</span>
            </div>
            <div className="beat-type">
              <div className="beat-indicator accent"></div>
              <span>Accented Beat</span>
            </div>
            <div className="beat-type">
              <div className="beat-indicator first"></div>
              <span>First Beat</span>
            </div>
          </div>
        </>
      )}
      
      <div className="about-section">
        <h3>About</h3>
        <p>
          LibreMetronome is an open-source metronome application designed for musicians of all skill levels. 
          It offers multiple visualization modes, customizable accent patterns, and training features.
        </p>
        <p className="version-info">
          Version 0.4.6
        </p>
      </div>
    </div>
  );
};

export default InfoContent;