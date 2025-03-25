import React, { useState } from 'react';
import './InfoSection.css';

const InfoSection = () => {
  const [activeTab, setActiveTab] = useState('about');

  return (
    <div className="info-section">
      <div className="info-section-tabs">
        <button 
          className={`info-tab ${activeTab === 'about' ? 'active' : ''}`}
          onClick={() => setActiveTab('about')}
        >
          About
        </button>
        <button 
          className={`info-tab ${activeTab === 'usage' ? 'active' : ''}`}
          onClick={() => setActiveTab('usage')}
        >
          How to Use
        </button>
        <button 
          className={`info-tab ${activeTab === 'features' ? 'active' : ''}`}
          onClick={() => setActiveTab('features')}
        >
          Features
        </button>
      </div>

      <div className={`info-tab-content ${activeTab === 'about' ? 'active' : ''}`}>
        <h2>Free Online Metronome</h2>
        <p>
          LibreMetronome is a professional-grade metronome that helps musicians develop precise timing
          and rhythm. Unlike physical metronomes, this free online tool offers multiple visualization 
          modes, customizable time signatures, and advanced training features.
        </p>
        
        <div className="info-block">
          <h3>What is a Metronome?</h3>
          <p>
            A metronome produces steady, precise beats at a selected tempo to help musicians maintain 
            consistent timing during practice. It's an essential tool for developing a strong internal 
            sense of rhythm and improving technical precision across all styles of music.
          </p>
        </div>
        
        <div className="info-block">
          <h3>Online Metronome Benefits</h3>
          <ul className="info-list">
            <li>Instantly accessible from any device with a browser</li>
            <li>Multiple visual modes for different learning preferences</li>
            <li>Customizable time signatures and subdivisions</li>
            <li>Precise tempo control with tap tempo feature</li>
            <li>Always completely free with no premium restrictions</li>
          </ul>
        </div>
      </div>

      <div className={`info-tab-content ${activeTab === 'usage' ? 'active' : ''}`}>
        <h2>How to Use LibreMetronome</h2>
        
        <div className="info-steps">
          <div className="info-step">
            <div className="step-number">1</div>
            <div>
              <h3>Select a Mode</h3>
              <p>Choose the visualization style that works best for you from the mode buttons at the top.</p>
            </div>
          </div>
          
          <div className="info-step">
            <div className="step-number">2</div>
            <div>
              <h3>Set Your Tempo</h3>
              <p>Adjust BPM (beats per minute) using the slider, or tap the tempo button to match your desired speed.</p>
            </div>
          </div>
          
          <div className="info-step">
            <div className="step-number">3</div>
            <div>
              <h3>Customize Settings</h3>
              <p>Adjust subdivisions, accents, and swing to practice different time signatures and rhythmic patterns.</p>
            </div>
          </div>
          
          <div className="info-step">
            <div className="step-number">4</div>
            <div>
              <h3>Start Practicing</h3>
              <p>Press the play button in the center (or hit spacebar) to start the metronome.</p>
            </div>
          </div>
        </div>
        
        <div className="info-tip">
          <span className="info-tip-icon">💡</span>
          <p>Press spacebar to start/stop. Use up/down arrow keys to adjust tempo by 5 BPM.</p>
        </div>
      </div>

      <div className={`info-tab-content ${activeTab === 'features' ? 'active' : ''}`}>
        <h2>Key Metronome Features</h2>
        
        <div className="info-grid">
          <div className="info-feature">
            <h3>Tap Tempo</h3>
            <p>Set the metronome speed by tapping in rhythm with your music</p>
          </div>
          
          <div className="info-feature">
            <h3>Time Signatures</h3>
            <p>Create custom beat patterns with adjustable accents for any meter</p>
          </div>
          
          <div className="info-feature">
            <h3>Visual Modes</h3>
            <p>Choose from Circle, Analog, Grid, Multi-Circle or Polyrhythm modes</p>
          </div>
          
          <div className="info-feature">
            <h3>Subdivisions</h3>
            <p>Practice with quarter notes, eighth notes, triplets and more</p>
          </div>
          
          <div className="info-feature">
            <h3>Swing Settings</h3>
            <p>Adjust swing feel for jazz, blues, and other shuffle-based styles</p>
          </div>
          
          <div className="info-feature">
            <h3>Training Tools</h3>
            <p>Advanced features like muting and gradual tempo increases</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InfoSection;