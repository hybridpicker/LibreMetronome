// ModeSelector.js
import React, { useState, useEffect } from 'react';
import './ModeSelector.css';

const ModeSelector = ({ mode, setMode }) => {
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [isCompactMenuOpen, setIsCompactMenuOpen] = useState(false);
  
  // Responsive behavior
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Define modes with placeholders for your custom SVG icons
  const modes = [
    { id: "analog", label: "Pendulum", iconPlaceholder: "P" },
    { id: "circle", label: "Circle", iconPlaceholder: "C" },
    { id: "grid", label: "Grid", iconPlaceholder: "G" },
    { id: "multi", label: "Multi Circle", iconPlaceholder: "M" },
    { id: "polyrhythm", label: "Polyrhythm", iconPlaceholder: "R" }
  ];
  
  // You will replace these placeholders with your SVG icons later
  const renderIcon = (mode_item) => {
    // This returns a placeholder that you can replace with your SVG icons
    return (
      <div className="mode-icon">
        {/* Replace this with your SVG icon */}
        <div style={{ 
          width: '100%', 
          height: '100%', 
          borderRadius: '50%',
          background: mode === mode_item.id ? '#ffffff' : '#aaaaaa',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '10px',
          fontWeight: 'bold'
        }}>
          {mode_item.iconPlaceholder}
        </div>
      </div>
    );
  };
  
  // Handle mode selection
  const handleModeSelect = (modeId) => {
    setMode(modeId);
    setIsCompactMenuOpen(false); // Close menu when selecting
  };
  
  // For tiny screens, use a dropdown/expandable menu
  if (windowWidth <= 320) {
    const activeMode = modes.find(mode_item => mode_item.id === mode) || modes[0];
    
    return (
      <div className="mode-selector">
        <div 
          className={`compact-menu-toggle ${isCompactMenuOpen ? 'open' : ''}`}
          onClick={() => setIsCompactMenuOpen(!isCompactMenuOpen)}
        >
          <span>Mode: {renderIcon(activeMode)} {activeMode.label}</span>
        </div>
        <div className={`compact-menu-content ${isCompactMenuOpen ? 'open' : ''}`}>
          {modes.map(mode_item => (
            <button
              key={mode_item.id}
              className={`mode-button ${mode === mode_item.id ? 'mode-button-active' : ''}`}
              onClick={() => handleModeSelect(mode_item.id)}
              aria-label={`Switch to ${mode_item.label} mode`}
            >
              {renderIcon(mode_item)} {mode_item.label}
            </button>
          ))}
        </div>
      </div>
    );
  }
  
  // For small mobile screens, show a more condensed view
  if (windowWidth <= 480) {
    return (
      <div className="mode-selector">
        {modes.map(mode_item => (
          <button
            key={mode_item.id}
            className={`mode-button ${mode === mode_item.id ? 'mode-button-active' : ''}`}
            onClick={() => handleModeSelect(mode_item.id)}
            aria-label={`Switch to ${mode_item.label} mode`}
          >
            {renderIcon(mode_item)}
            <span>{mode_item.label.replace(' Circle', '').replace('rhythm', '')}</span>
          </button>
        ))}
      </div>
    );
  }
  
  // Default view for larger screens
  return (
    <div className="mode-selector">
      {modes.map(mode_item => (
        <button
          key={mode_item.id}
          className={`mode-button ${mode === mode_item.id ? 'mode-button-active' : ''}`}
          onClick={() => handleModeSelect(mode_item.id)}
          aria-label={`Switch to ${mode_item.label} mode`}
        >
          {renderIcon(mode_item)}
          <span>{mode_item.label}</span>
        </button>
      ))}
    </div>
  );
};

export default ModeSelector;