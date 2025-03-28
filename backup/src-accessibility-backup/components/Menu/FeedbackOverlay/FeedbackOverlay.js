import React, { useState, useEffect } from 'react';
import feedbackButtonIcon from '../../../assets/svg/feedback-button.svg';
import './FeedbackOverlay.css';

// Feedback modal component with rating, comments, and submission functionality
const FeedbackModal = ({ onClose, onSubmit, currentMode, currentTempo }) => {
  const [rating, setRating] = useState(3);
  const [comments, setComments] = useState('');
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 600);
  
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 600);
    };
    
    window.addEventListener('resize', handleResize);
    
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleResize);
    };
  }, [onClose]);

  const handleSubmit = () => {
    // Collect contextual metadata
    const feedbackData = {
      rating,
      comments,
      email: email || 'Anonymous',
      contextData: {
        timestamp: new Date().toISOString(),
        mode: currentMode,
        tempo: currentTempo,
        deviceType: isMobile ? 'mobile' : 'desktop',
        userAgent: navigator.userAgent,
        screenSize: `${window.innerWidth}x${window.innerHeight}`
      }
    };
    
    // Submit feedback
    onSubmit(feedbackData);
    setSubmitted(true);
    
    // Reset form after 2 seconds and close
    setTimeout(() => {
      setRating(3);
      setComments('');
      setEmail('');
      setSubmitted(false);
      onClose();
    }, 2000);
  };

  const renderStars = () => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <span 
          key={i}
          className={`star ${i <= rating ? 'star-filled' : 'star-empty'}`}
          onClick={() => setRating(i)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              setRating(i);
            }
          }}
          tabIndex="0"
          role="button"
          aria-label={`Rate ${i} stars`}
        >
          {i <= rating ? '★' : '☆'}
        </span>
      );
    }
    return stars;
  };

  // If feedback has been submitted, show a thank you message
  if (submitted) {
    return (
      <div className="feedback-overlay" role="dialog" aria-modal="true">
        <div className="feedback-modal feedback-success">
          <h2>Thank You!</h2>
          <p>Your feedback has been submitted successfully.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="feedback-overlay" role="dialog" aria-modal="true">
      <div className="feedback-modal">
        <button 
          className="feedback-close-button" 
          onClick={onClose} 
          aria-label="Close Feedback"
        >
          &times;
        </button>
        
        <h2>Share Your Feedback</h2>
        <p>We'd love to hear about your experience with LibreMetronome</p>
        
        <div className="feedback-form">
          <div className="rating-container">
            <label htmlFor="rating">How would you rate your experience?</label>
            <div className="stars-container" id="rating" aria-label="Rating">
              {renderStars()}
            </div>
          </div>
          
          <div className="input-group">
            <label htmlFor="comments">Comments</label>
            <textarea
              id="comments"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="What features do you like? What could be improved?"
              rows={4}
            />
          </div>
          
          <div className="input-group">
            <label htmlFor="email">Email (optional)</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="For follow-up questions"
            />
          </div>
          
          <button 
            onClick={handleSubmit} 
            className="feedback-submit-button"
            disabled={!comments}
          >
            Submit Feedback
          </button>
        </div>
      </div>
    </div>
  );
};

// Feedback button that is always visible - temporarily disabled
const FeedbackButton = ({ onClick, active }) => (
  <button 
    className={`feedback-button ${active ? 'feedback-button-active' : ''} feedback-button-disabled`} 
    onClick={onClick} 
    aria-label="Provide Feedback"
    disabled={true}
    title="Coming soon"
  >
    Feedback
  </button>
);

// Main component - button temporarily hidden
const FeedbackOverlay = ({ currentMode, currentTempo }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isFeedbackButtonActive, setIsFeedbackButtonActive] = useState(false);

  const toggleOverlay = () => {
    // Temporarily disabled until backend is connected
    console.log('Feedback feature coming soon - will be connected to Django backend');
    return;
    
    // Original code preserved for future activation
    /*
    setIsVisible((prev) => !prev);
    setIsFeedbackButtonActive((prev) => !prev);
    */
  };

  const handleFeedbackSubmit = (feedbackData) => {
    // In a real application, this would send data to a backend service
    console.log('Feedback received:', feedbackData);
    
    // For now, just log to console, but could be extended to:
    // 1. Send to a backend API
    // 2. Store in localStorage
    // 3. Use a third-party service like Firebase, Supabase, etc.
  };

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'F' || event.key === 'f') {
        // Keyboard shortcut temporarily disabled
        console.log('Feedback feature coming soon - will be connected to Django backend');
        // setIsVisible((prev) => !prev);
        // setIsFeedbackButtonActive((prev) => !prev);
      } else if (event.key === 'Escape') {
        setIsVisible(false);
        setIsFeedbackButtonActive(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <>
      {/* Feedback button temporarily hidden 
      <FeedbackButton onClick={toggleOverlay} active={isFeedbackButtonActive} />
      */}
      {isVisible && (
        <FeedbackModal 
          onClose={toggleOverlay} 
          onSubmit={handleFeedbackSubmit} 
          currentMode={currentMode}
          currentTempo={currentTempo}
        />
      )}
    </>
  );
};

export default FeedbackOverlay;
