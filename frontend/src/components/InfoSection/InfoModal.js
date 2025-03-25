import React, { useState, useEffect, useRef } from 'react';
import './InfoModal.css';
import packageJson from '../../../package.json';

const InfoModal = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState('about');
  const modalRef = useRef(null);

  // Close when clicking outside the modal
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Handle ESC key to close the modal
  useEffect(() => {
    const handleEsc = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
    }
    
    return () => {
      document.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="info-modal-overlay">
      {/* Close button placed outside the modal for guaranteed visibility */}
      <button 
        className="info-modal-close" 
        onClick={onClose} 
        aria-label="Close guide"
        title="Close guide (ESC)"
      >
        ×
      </button>
      
      <div className="info-modal" ref={modalRef}>
        <div className="info-modal-header">
          <h1>Metronome Guide</h1>
          <div className="info-modal-tabs">
            <button 
              className={`info-modal-tab ${activeTab === 'about' ? 'active' : ''}`}
              onClick={() => setActiveTab('about')}
            >
              About
            </button>
            <button 
              className={`info-modal-tab ${activeTab === 'usage' ? 'active' : ''}`}
              onClick={() => setActiveTab('usage')}
            >
              How to Use
            </button>
            <button 
              className={`info-modal-tab ${activeTab === 'features' ? 'active' : ''}`}
              onClick={() => setActiveTab('features')}
            >
              Features
            </button>
            <button 
              className={`info-modal-tab ${activeTab === 'shortcuts' ? 'active' : ''}`}
              onClick={() => setActiveTab('shortcuts')}
            >
              Shortcuts
            </button>
          </div>
        </div>

        <div className="info-modal-content">
          <div className={`info-modal-panel ${activeTab === 'about' ? 'active' : ''}`}>
            <h2>Free Online Metronome</h2>
            <p>
              LibreMetronome is a professional-grade metronome that helps musicians develop precise timing
              and rhythm. Unlike physical metronomes, this free online tool offers multiple visualization 
              modes, customizable time signatures, and advanced training features.
            </p>
            
            <div className="info-section-block">
              <h3>What is a Metronome?</h3>
              <p>
                A metronome produces steady, precise beats at a selected tempo to help musicians maintain 
                consistent timing during practice. It's an essential tool for developing a strong internal 
                sense of rhythm and improving technical precision across all styles of music.
              </p>
            </div>
            
            <div className="info-section-block">
              <h3>Online Metronome Benefits</h3>
              <ul className="info-section-list">
                <li>Instantly accessible from any device with a browser</li>
                <li>Multiple visual modes for different learning preferences</li>
                <li>Customizable time signatures and subdivisions</li>
                <li>Precise tempo control with tap tempo feature</li>
                <li>Always completely free with no premium restrictions</li>
              </ul>
            </div>
          </div>

          <div className={`info-modal-panel ${activeTab === 'usage' ? 'active' : ''}`}>
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

          <div className={`info-modal-panel ${activeTab === 'features' ? 'active' : ''}`}>
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
          
          <div className={`info-modal-panel ${activeTab === 'shortcuts' ? 'active' : ''}`}>
            <h2>Keyboard Shortcuts</h2>
            
            <ul className="shortcuts-list">
              <li><span className="key">Space</span> Start/Pause metronome</li>
              <li><span className="key">T</span> Tap tempo</li>
              <li><span className="key">1–9</span> Set Beats per Bar</li>
              <li><span className="key">↑↓</span> Increase/decrease tempo by 5 BPM</li>
              <li><span className="key">A</span> Switch to Analog/Pendulum mode</li>
              <li><span className="key">C</span> Switch to Circle mode</li>
              <li><span className="key">G</span> Switch to Grid mode</li>
              <li><span className="key">M</span> Switch to Multi Circle mode</li>
              <li><span className="key">Y</span> Switch to Polyrhythm mode</li>
              <li><span className="key">I</span> Open this Guide</li>
              <li><span className="key">R</span> Show Training menu</li>
              <li><span className="key">S</span> Show Settings menu</li>
              <li><span className="key">D</span> Show Support menu</li>
              <li><span className="key">Enter</span> Force tempo increase (Training Mode)</li>
              <li><span className="key">Esc</span> Close menus and dialogs</li>
            </ul>
            
            <h3>Beat Types</h3>
            <div className="beat-types">
              <div className="beat-type">
                <div className="beat-indicator muted"></div>
                <span>Muted Beat</span>
              </div>
              <div className="beat-type">
                <div className="beat-indicator normal"></div>
                <span>Normal Beat</span>
              </div>
              <div className="beat-type">
                <div className="beat-indicator accent"></div>
                <span>Accented Beat</span>
              </div>
              <div className="beat-type">
                <div className="beat-indicator first"></div>
                <span>First Beat</span>
              </div>
            </div>
            
            <div className="version-info">
              <p>LibreMetronome Version {packageJson.version} | <a href="https://github.com/hybridpicker/LibreMetronome" target="_blank" rel="noopener noreferrer">GitHub</a> | GPL v3 License</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InfoModal;