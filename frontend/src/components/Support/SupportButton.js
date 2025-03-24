import React, { useState, useEffect } from 'react';
import { getPaymentLink } from '../../utils/supportUtils';
import './SupportButton.css';

const SupportButton = ({ useInternalPage }) => {
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
    if (useInternalPage && window.setShowSupportPage) {
      // Navigate to internal support page if the function exists
      window.setShowSupportPage(true);
    } else if (paymentLink) {
      // Otherwise, open Stripe payment link in a new tab
      window.open(paymentLink, '_blank');
    }
  };

  return (
    <button 
      className={`support-button ${isLoading ? 'loading' : ''}`}
      onClick={handleSupportClick}
      aria-label="Support this project"
      disabled={(!paymentLink && !useInternalPage) || isLoading}
    >
      <span className="heart-icon">♥</span>
      {isLoading ? <span className="loading-dots">Loading</span> : 'Donate'}
    </button>
  );
};

export default SupportButton;
