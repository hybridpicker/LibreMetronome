// src/components/ModeSelector.js
import React, { useState, useEffect } from 'react';
import './ModeSelector.css';

// Import SVG icons directly - corrected path
import AnalogIcon from '../assets/svg/modeIcon/Analog.svg';
import CircleIcon from '../assets/svg/modeIcon/Circle.svg';
import GridIcon from '../assets/svg/modeIcon/Grid.svg';
import MultiIcon from '../assets/svg/modeIcon/Multi.svg';
import PolyIcon from '../assets/svg/modeIcon/Poly.svg';

const ModeSelector = ({ mode, setMode }) => {
  const [hoveredMode, setHoveredMode] = useState(null);
  const [showAllModes, setShowAllModes] = useState(window.innerWidth > 350);
  const [showMoreButton, setShowMoreButton] = useState(window.innerWidth <= 350);

  // Update responsive state on window resize
  useEffect(() => {
    const handleResize = () => {
      const isTinyScreen = window.innerWidth <= 350;
      setShowAllModes(!isTinyScreen);
      setShowMoreButton(isTinyScreen);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Mode configurations with descriptions for tooltips
  const modeConfigs = [
    {
      id: "analog",
      name: "Analog",
      icon: AnalogIcon,
      description: "Classic pendulum-style metronome with realistic motion"
    },
    {
      id: "circle",
      name: "Circle",
      icon: CircleIcon,
      description: "Interactive circular beat visualization with customizable accents"
    },
    {
      id: "grid",
      name: "Grid",
      icon: GridIcon,
      description: "Visual grid pattern for creating and visualizing complex rhythms"
    },
    {
      id: "multi",
      name: "Multi",
      icon: MultiIcon,
      description: "Multiple circles for practicing compound rhythms"
    },
    {
      id: "polyrhythm",
      name: "Polyrhythm",
      icon: PolyIcon,
      description: "Two rhythmic patterns played simultaneously for advanced practice"
    }
  ];

  const handleModeChange = (modeId) => {
    setMode(modeId);
  };

  const handleMouseEnter = (modeId) => {
    setHoveredMode(modeId);
  };

  const handleMouseLeave = () => {
    setHoveredMode(null);
  };

  // Function to show essential modes for tiny screens
  const getVisibleModes = () => {
    if (showAllModes) {
      return modeConfigs;
    } else {
      // On tiny screens, only show the current mode plus Circle and Grid (most commonly used)
      return modeConfigs.filter(config => 
        config.id === mode || 
        config.id === 'circle' || 
        config.id === 'grid'
      );
    }
  };

  return (
    <div className="mode-selector-container">
      <div className="mode-selector">
        {getVisibleModes().map((modeConfig) => (
          <div 
            key={modeConfig.id}
            className={`mode-option ${mode === modeConfig.id ? 'active' : ''}`}
            onClick={() => handleModeChange(modeConfig.id)}
            onMouseEnter={() => handleMouseEnter(modeConfig.id)}
            onMouseLeave={handleMouseLeave}
          >
            <div className="mode-icon-container">
              <img 
                src={modeConfig.icon} 
                alt={`${modeConfig.name} Mode`} 
                className="mode-icon"
              />
              {mode === modeConfig.id && (
                <div className="active-indicator" aria-hidden="true"></div>
              )}
            </div>
            <div className="mode-name">{modeConfig.name}</div>
            
            {hoveredMode === modeConfig.id && (
              <div className="mode-tooltip">
                {modeConfig.description}
              </div>
            )}
          </div>
        ))}
        
        {showMoreButton && !showAllModes && (
          <div 
            className="mode-option more-button"
            onClick={() => setShowAllModes(true)}
          >
            <div className="mode-icon-container">
              <div className="more-icon">•••</div>
            </div>
            <div className="mode-name">More</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ModeSelector;