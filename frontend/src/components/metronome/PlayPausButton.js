// File: src/components/metronome/PlayPauseButton.js
import React from 'react';
import playIcon from '../../assets/svg/play.svg';
import pauseIcon from '../../assets/svg/pause.svg';

const PlayPauseButton = ({ isPaused, onToggle, style = {} }) => (
  <button onClick={onToggle} style={{ background: 'transparent', border: 'none', cursor: 'pointer', ...style }} aria-label="Toggle play/pause">
    <img src={isPaused ? playIcon : pauseIcon} alt={isPaused ? 'Play' : 'Pause'} style={{ width: '36px', height: '36px', objectFit: 'contain' }} />
  </button>
);

export default PlayPauseButton;
