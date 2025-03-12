// src/components/Menu/mainMenu.js
import React, { useState, useEffect } from 'react';
import './mainMenu.css';
import InfoContent from './InfoContent';
import TrainingContent from './TrainingContent';
import SettingsContent from './SettingsContent';
import { ReactComponent as MenuIcon } from '../../assets/svg/menu-icon.svg';

/**
 * Unified MainMenu Component
 * A consolidated menu system for LibreMetronome that integrates:
 * - Info page
 * - Training settings
 * - App settings
 * - Quick access buttons
 */
const MainMenu = ({
  // For Training
  trainingSettings,
  setTrainingSettings,
  setMode,
  setIsPaused,
  
  // For Settings
  volume,
  setVolume,
  defaultTempo,
  setDefaultTempo,
  defaultSubdivisions,
  setDefaultSubdivisions,
  
  // For all tabs
  currentMode,
  currentTempo,
  
  // For sound reload
  setSoundSetReloadTrigger
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('info'); // 'info', 'training', 'settings'
  const [isMobile, setIsMobile] = useState(window.innerWidth < 600);
  
  // State to track if training mode is active
  const trainingActive = trainingSettings.macroMode !== 0 || trainingSettings.speedMode !== 0;
  
  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 600);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Close menu function
  const handleClose = () => {
    setIsVisible(false);
  };
  
  // Close menu when Escape is pressed and handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        handleClose();
      } else if (event.key === 'I' || event.key === 'i') {
        setIsVisible(true);
        setActiveTab('info');
      } else if (event.key === 'T' || event.key === 't') {
        setIsVisible(true);
        setActiveTab('training');
      } else if (event.key === 'S' || event.key === 's') {
        setIsVisible(true);
        setActiveTab('settings');
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Function to open the menu with a specific tab
  const openMenuWithTab = (tab) => {
    setActiveTab(tab);
    setIsVisible(true);
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
            setSoundSetReloadTrigger={setSoundSetReloadTrigger}
          />
        );
      default:
        return <InfoContent />;
    }
  };

  return (
    <>
      {/* Quick Access Buttons */}
      <div className="quick-access-buttons">
        <button 
          className={`quick-button info-button ${activeTab === 'info' && isVisible ? 'active' : ''}`}
          onClick={() => openMenuWithTab('info')}
          aria-label="Information"
          title="Information (I)"
        >
          <span role="img" aria-hidden="true">ℹ️</span>
          {!isMobile && <span>Info</span>}
        </button>
        
        <button 
          className={`quick-button training-button ${activeTab === 'training' && isVisible ? 'active' : ''} ${trainingActive ? 'training-active' : ''}`}
          onClick={() => openMenuWithTab('training')}
          aria-label="Training Settings"
          title="Training Settings (T)"
        >
          <span role="img" aria-hidden="true">🎯</span>
          {!isMobile && <span>{trainingActive ? 'Training On' : 'Training'}</span>}
        </button>
      </div>
      
      {/* Main Menu Button */}
      <button 
        className={`menu-button ${isVisible ? 'active' : ''}`}
        onClick={() => setIsVisible(prev => !prev)}
        aria-label="Main Menu"
        title="Settings (S)"
      >
        <MenuIcon />
      </button>
      
      {/* Menu Overlay */}
      {isVisible && (
        <div className="menu-overlay" role="dialog" aria-modal="true">
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
                        <span className="tab-icon">ℹ️</span>
                <span>Info</span>
              </button>
              <button 
                className={`menu-tab ${activeTab === 'training' ? 'active' : ''}`}
                onClick={() => setActiveTab('training')}
              >
                <span className="tab-icon">🎯</span>
                <span>Training</span>
              </button>
              <button 
                className={`menu-tab ${activeTab === 'settings' ? 'active' : ''}`}
                onClick={() => setActiveTab('settings')}
              >
                <span className="tab-icon">⚙️</span>
                <span>Settings</span>
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