// src/components/metronome/MultiCircleMode/PlayButton.js
import React, { useEffect, useState } from 'react';
import playIcon from "../../../assets/svg/play.svg";
import pauseIcon from "../../../assets/svg/pause.svg";

const PlayButton = ({ handlePlayPause, isPaused }) => {
  // Track if color blind mode is active
  const [isColorBlind, setIsColorBlind] = useState(
    document.body.classList.contains('color-blind')
  );

  // Listen for accessibility setting changes
  useEffect(() => {
    const handleAccessibilityChange = (e) => {
      if (e.detail && e.detail.setting === 'colorBlindMode') {
        setIsColorBlind(e.detail.value !== 'none');
      }
    };

    window.addEventListener('accessibility-settings-changed', handleAccessibilityChange);
    
    // Check on initial render
    setIsColorBlind(document.body.classList.contains('color-blind'));

    return () => {
      window.removeEventListener('accessibility-settings-changed', handleAccessibilityChange);
    };
  }, []);

  return (
    <div style={{ marginTop: "20px", display: "flex", justifyContent: "center" }}>
      <button
        className={`play-pause-button ${isColorBlind ? 'color-blind-button' : ''}`}
        type="button"
        onClick={handlePlayPause}
        onKeyDown={e => { e.stopPropagation(); e.preventDefault(); }}
        aria-label="Toggle Play/Pause"
        data-state={isPaused ? 'paused' : 'playing'}
      >
        <img 
          className={`play-pause-icon ${isColorBlind ? 'color-blind-icon' : ''}`}
          src={isPaused ? playIcon : pauseIcon}
          alt={isPaused ? "Play" : "Pause"}
        />
      </button>
    </div>
  );
};

export default PlayButton;