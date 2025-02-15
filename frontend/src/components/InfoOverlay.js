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
          <li><strong>Left/Right Arrows:</strong> Increase/Decrease tempo (default step)</li>
          <li><strong>Ctrl/Cmd + Left/Right Arrows:</strong> Increase/Decrease tempo by 1 BPM</li>
          <li><strong>A:</strong> Switch to Analog Mode</li>
          <li><strong>C:</strong> Switch to Circle Mode</li>
          <li><strong>G:</strong> Switch to Grid Mode</li>
          <li><strong>I:</strong> Show/Hide Info Overlay</li>
        </ul>
      </div>
    </div>
  );
};

// Info button that is always visible
const InfoButton = ({ onClick }) => (
  <button className="info-button" onClick={onClick} aria-label="Toggle Info Overlay">
    <img src={infoButtonIcon} alt="Info" />
  </button>
);

// Main component that combines the button and modal
const InfoOverlay = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [tempo, setTempo] = useState(120); // Beispielwert für Tempo

  const toggleOverlay = () => {
    setIsVisible((prev) => !prev);
  };

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'I' || event.key === 'i') {
        setIsVisible(true);
      } else if (event.key === 'Escape') {
        setIsVisible(false);
      } else if (event.key === 'ArrowRight') {
        if (event.ctrlKey || event.metaKey) {
          setTempo((prevTempo) => prevTempo + 1); // Erhöht um 1 BPM mit Strg/Cmd
        } else {
          setTempo((prevTempo) => prevTempo + 5); // Erhöht um 5 BPM standardmäßig
        }
      } else if (event.key === 'ArrowLeft') {
        if (event.ctrlKey || event.metaKey) {
          setTempo((prevTempo) => prevTempo - 1); // Verringert um 1 BPM mit Strg/Cmd
        } else {
          setTempo((prevTempo) => prevTempo - 5); // Verringert um 5 BPM standardmäßig
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
      <InfoButton onClick={toggleOverlay} />
      {isVisible && <InfoModal onClose={toggleOverlay} />}
    </>
  );
};

export default InfoOverlay;
