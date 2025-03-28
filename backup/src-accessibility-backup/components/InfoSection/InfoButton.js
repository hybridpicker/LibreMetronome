import React from 'react';
import './InfoButton.css';

const InfoButton = ({ onClick }) => {
  return (
    <button className="info-button" onClick={onClick}>
      <span className="info-button-text">Guide</span>
      <span className="info-button-icon">ⓘ</span>
    </button>
  );
};

export default InfoButton;
