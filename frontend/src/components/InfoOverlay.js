// src/components/InfoOverlay.js
import React from 'react';
import infoButtonIcon from '../assets/svg/info-button.svg';
import './InfoOverlay.css'; // Create/update CSS for modal styling

// The overlay/modal component
const InfoModal = ({ onClose }) => (
  <div className="info-overlay" role="dialog" aria-modal="true">
    <div className="info-modal">
      <button
        className="info-close-button"
        onClick={onClose}
        aria-label="Close Information"
      >
        &times;
      </button>
      <h2>Metronome Information</h2>
      <ul>
        <li>
          <strong>Interactive Controls:</strong> Easily adjustable parameters such as tempo, swing, and volume. The swing and volume values are displayed as percentages (0–100%), while the tempo is displayed in BPM.
        </li>
        <li>
          <strong>Keyboard Interaction:</strong> In addition to mouse or touch controls, the application supports keyboard shortcuts (e.g., Space to start/pause, numeric keys (1–9) to adjust subdivisions, and "T" for tap tempo).
        </li>
      </ul>
    </div>
  </div>
);

// The Info button component that toggles the overlay
const InfoButton = () => {
  const [isInfoVisible, setIsInfoVisible] = React.useState(false);

  const toggleInfo = () => {
    setIsInfoVisible((prev) => !prev);
  };

  return (
    <>
      <button
        className="info-button"
        onClick={toggleInfo}
        aria-label="Information"
      >
        <img src={infoButtonIcon} alt="Info" />
      </button>
      {isInfoVisible && <InfoModal onClose={toggleInfo} />}
    </>
  );
};

export default InfoButton;