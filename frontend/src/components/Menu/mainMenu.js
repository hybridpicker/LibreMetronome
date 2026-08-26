// src/components/Menu/mainMenu.js
import React, { useState, useEffect, useRef } from 'react';
import './mainMenu.css';
// InfoContent removed as it's no longer needed
import TrainingContent from './TrainingContent';
import SettingsContent from './SettingsContent';
import { ReactComponent as MenuIcon } from '../../assets/svg/menu-icon.svg';
import { SupportPage } from '../Support';
import InterfaceIcon from '../common/InterfaceIcon';

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
  const [activeTab, setActiveTab] = useState('training'); // 'training', 'settings', 'support'
  const menuButtonRef = useRef(null);
  const closeButtonRef = useRef(null);
  
  // Close menu function
  const handleClose = () => {
    setIsVisible(false);
    window.requestAnimationFrame(() => menuButtonRef.current?.focus());
  };

  useEffect(() => {
    if (isVisible) {
      window.requestAnimationFrame(() => closeButtonRef.current?.focus());
    }
  }, [isVisible]);
  
  // Close menu when Escape is pressed and handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        handleClose();
      /* Info keyboard shortcut removed */
      } else if (event.key === 'R' || event.key === 'r') {
        setIsVisible(true);
        setActiveTab('training');
      } else if (event.key === 'S' || event.key === 's') {
        setIsVisible(true);
        setActiveTab('settings');
      } else if (event.key === 'D' || event.key === 'd') {
        setIsVisible(true);
        setActiveTab('support');
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Render tab content based on active tab
  const renderTabContent = () => {
    switch (activeTab) {
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
      case 'support':
        return <SupportPage />;
      default:
        return <TrainingContent 
          trainingSettings={trainingSettings}
          setTrainingSettings={setTrainingSettings}
          setMode={setMode}
          setIsPaused={setIsPaused}
          onClose={handleClose}
        />;
    }
  };

  return (
    <>
      {/* Quick Access Buttons removed */}
      
      {/* Main Menu Button */}
      <button 
        ref={menuButtonRef}
        className={`menu-button ${isVisible ? 'active' : ''}`}
        onClick={() => setIsVisible(prev => !prev)}
        aria-label="Main Menu"
        title="Settings (S)"
      >
        <MenuIcon />
      </button>
      
      {/* Menu Overlay */}
      {isVisible && (
        <div className="menu-overlay" role="dialog" aria-modal="true" aria-labelledby="menu-title">
          <div className="menu-modal">
            <h2 id="menu-title" className="menu-title">Practice controls</h2>
            <button 
              ref={closeButtonRef}
              className="menu-close-button" 
              onClick={handleClose}
              aria-label="Close Menu"
              title="Close menu (ESC)"
            >
              <InterfaceIcon name="close" size={22} />
            </button>
            
            {/* Tabs */}
            <div className="menu-tabs" role="tablist" aria-label="Menu sections">
              <button 
                className={`menu-tab ${activeTab === 'training' ? 'active' : ''}`}
                onClick={() => setActiveTab('training')}
                role="tab"
                aria-selected={activeTab === 'training'}
              >
                <InterfaceIcon name="training" />
                <span>Training</span>
              </button>
              <button 
                className={`menu-tab ${activeTab === 'settings' ? 'active' : ''}`}
                onClick={() => setActiveTab('settings')}
                role="tab"
                aria-selected={activeTab === 'settings'}
              >
                <InterfaceIcon name="settings" />
                <span>Settings</span>
              </button>
              <button 
                className={`menu-tab support-tab ${activeTab === 'support' ? 'active' : ''}`}
                onClick={() => setActiveTab('support')}
                role="tab"
                aria-selected={activeTab === 'support'}
              >
                <InterfaceIcon name="support" />
                <span>Support</span>
              </button>
            </div>
            
            {/* Content Area */}
            <div className="menu-content" role="tabpanel">
              {renderTabContent()}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MainMenu;
