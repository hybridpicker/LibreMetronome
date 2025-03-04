// src/components/metronome/MultiCircleMode/PlayButton.js
import React from 'react';
import playIcon from "../../../assets/svg/play.svg";
import pauseIcon from "../../../assets/svg/pause.svg";

const PlayButton = ({ handlePlayPause, isPaused }) => {
  return (
    <div style={{ marginTop: "20px", display: "flex", justifyContent: "center" }}>
      <button
        className="play-pause-button"
        type="button"
        onClick={handlePlayPause}
        onKeyDown={e => { e.stopPropagation(); e.preventDefault(); }}
        aria-label="Toggle Play/Pause"
      >
        <img 
          className="play-pause-icon"
          src={isPaused ? playIcon : pauseIcon}
          alt={isPaused ? "Play" : "Pause"}
        />
      </button>
    </div>
  );
};

export default PlayButton;