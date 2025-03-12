// src/components/Menu/mainMenu.js
import React, { useState, useEffect } from 'react';
import './mainMenu.css';
import InfoContent from './InfoContent';
import TrainingContent from './TrainingContent';
import SettingsContent from './SettingsContent';
import { ReactComponent as MenuIcon } from '../../assets/svg/menu-icon.svg';

/**
 * MainMenu Component
 * A unified menu system for LibreMetronome that includes:
 * - Info page
 * - Training settings
 * - App settings
 */
const MainMenu = ({
  // For Training
  trainingSettings,
  setTrainingSettings,
  setMode,
  setIsPaused,
  
  // For Settings (new)
  volume,
  setVolume,
  defaultTempo,
  setDefaultTempo,
  defaultSubdivisions,
  setDefaultSubdivisions,
  
  // For all tabs
  currentMode,
  
  // Add this new prop for sound reload
  setSoundSetReloadTrigger
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('info'); // 'info', 'training', 'settings'
  
  // Close menu function
  const handleClose = () => {
    setIsVisible(false);
  };
  
  // Close menu when Escape is pressed
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        handleClose();
      } else if (event.key === 'I' || event.key === 'i') {
        setIsVisible(prev => !prev);
        setActiveTab('info');
      } else if (event.key === 'T' || event.key === 't') {
        setIsVisible(prev => !prev);
        setActiveTab('training');
      } else if (event.key === 'S' || event.key === 's') {
        setIsVisible(prev => !prev);
        setActiveTab('settings');
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Toggle the menu visibility
  const toggleMenu = () => {
    setIsVisible(prev => !prev);
  };
  
  // Render tab content based on active tab
  const renderTabContent = () => {
    switch (activeTab) {
      case 'info':
        return <InfoContent />;
      case 'training':
        return (
          <TrainingContent
            trainingSettings={trainingSettings}
            setTrainingSettings={setTrainingSettings}
            setMode={setMode}
            setIsPaused={setIsPaused}
            onClose={handleClose}
          />
        );
      case 'settings':
        return (
          <SettingsContent
            volume={volume}
            setVolume={setVolume}
            defaultTempo={defaultTempo}
            setDefaultTempo={setDefaultTempo}
            defaultSubdivisions={defaultSubdivisions}
            setDefaultSubdivisions={setDefaultSubdivisions}
            currentMode={currentMode}
            onClose={handleClose}
            setSoundSetReloadTrigger={setSoundSetReloadTrigger} // Pass the new prop
          />
        );
      default:
        return <InfoContent />;
    }
  };

  return (
    <>
      {/* Menu Button */}
      <button 
        className="menu-button"
        onClick={toggleMenu}
        aria-label="Open Menu"
      >
        <MenuIcon />
      </button>
      
      {/* Menu Overlay */}
      {isVisible && (
        <div className="menu-overlay">
          <div className="menu-modal">
            <button 
              className="menu-close-button" 
              onClick={handleClose}
              aria-label="Close Menu"
            >
              &times;
            </button>
            
            {/* Tabs */}
            <div className="menu-tabs">
              <button 
                className={`menu-tab ${activeTab === 'info' ? 'active' : ''}`}
                onClick={() => setActiveTab('info')}
              >
                Info
              </button>
              <button 
                className={`menu-tab ${activeTab === 'training' ? 'active' : ''}`}
                onClick={() => setActiveTab('training')}
              >
                Training
              </button>
              <button 
                className={`menu-tab ${activeTab === 'settings' ? 'active' : ''}`}
                onClick={() => setActiveTab('settings')}
              >
                Settings
              </button>
            </div>
            
            {/* Content Area */}
            <div className="menu-content">
              {renderTabContent()}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MainMenu;