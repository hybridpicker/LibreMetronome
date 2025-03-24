import React, { useState, useEffect } from 'react';
import { getPaymentLink } from '../../utils/supportUtils';
import './SupportPage.css';

const SupportPage = () => {
  const [paymentLink, setPaymentLink] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const fetchLink = async () => {
      setIsLoading(true);
      try {
        const link = await getPaymentLink();
        setPaymentLink(link);
      } catch (error) {
        console.error('Failed to get payment link in component:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchLink();
  }, []);

  const handleSupportClick = () => {
    if (paymentLink) {
      window.open(paymentLink, '_blank');
    }
  };

  return (
    <div className="support-page">
      <h1 className="minimalist-heading">Support LibreMetronome</h1>
      <div className="support-message">
        <p>
          LibreMetronome is and will <strong>always remain completely free</strong>, open-source, and without advertisements or premium features.
          All functionality is available to every user.
        </p>
        
        <p>
          Your support helps fund ongoing development, server costs, and enables me to create <strong>more open-source music tools</strong> and applications in the future.
        </p>
      </div>
      
      <div className="support-options">
        <button 
          className={`support-button-large ${isLoading ? 'loading' : ''}`}
          onClick={handleSupportClick}
          disabled={!paymentLink || isLoading}
        >
          <span className="heart-icon">♥</span> 
          {isLoading ? <span className="loading-dots">Loading</span> : 'Support'}
        </button>
      </div>
      
      <div className="support-info">
        <h2>Support Goals</h2>
        <ul>
          <li>Remain Ad-Free</li>
          <li>Server Costs</li>
          <li>New Features</li>
          <li>More Music Tools</li>
        </ul>
      </div>
      
      <div className="support-features-coming">
        <h3>Future Development</h3>
        <div className="feature-cards">
          <div className="feature-card">
            <div className="feature-icon">🎵</div>
            <h4>Premium Sounds</h4>
            <p>High-quality metronome samples</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">📱</div>
            <h4>Mobile Apps</h4>
            <p>iOS and Android with offline use</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🔄</div>
            <h4>Advanced Training</h4>
            <p>Adaptive rhythm exercises</p>
          </div>
        </div>
      </div>
      
      <div className="support-thanks">
        <p>Thank you for using LibreMetronome</p>
      </div>
    </div>
  );
};

export default SupportPage;
