import React, { useState, useEffect } from 'react';
import infoButtonIcon from '../assets/svg/info-button.svg';
import './InfoOverlay.css';

// Modal displayed when the info overlay is active
const InfoModal = ({ onClose }) => {
  
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

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
        <h2>Keyboard Shortcuts</h2>
        <ul>
          <li><strong>Space:</strong> Start/Pause</li>
          <li><strong>T:</strong> Tap tempo</li>
          <li><strong>1–9:</strong> Adjust subdivisions</li>
          <li><strong>Left/Right Arrows:</strong> Increase/Decrease tempo by 5 BPM</li>
          <li><strong>A:</strong> Switch to Analog Mode</li>
          <li><strong>C:</strong> Switch to Circle Mode</li>
          <li><strong>G:</strong> Switch to Grid Mode</li>
          <li><strong>M:</strong> Switch to Multi Circle Mode</li>
          <li><strong>U:</strong> Manual tempo increase</li>
          <li><strong>I:</strong> Show Info Overlay</li>
          <li><strong>Esc:</strong> Close any open menu</li>
        </ul>
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
  const [tempo, setTempo] = useState(120);

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
      } else if (event.key === 'ArrowRight') {
        if (event.ctrlKey || event.metaKey) {
          setTempo((prevTempo) => prevTempo + 1);
        } else {
          setTempo((prevTempo) => prevTempo + 5);
        }
      } else if (event.key === 'ArrowLeft') {
        if (event.ctrlKey || event.metaKey) {
          setTempo((prevTempo) => prevTempo - 1); 
        } else {
          setTempo((prevTempo) => prevTempo - 5);
        }
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