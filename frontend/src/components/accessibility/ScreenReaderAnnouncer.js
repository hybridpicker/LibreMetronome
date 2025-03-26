import React, { useEffect, useRef } from 'react';

/**
 * Component that provides a stable live region for screen reader announcements
 * @param {Object} props
 * @param {string} props.message - The message to announce
 * @param {string} props.politeness - The politeness level ('polite' or 'assertive')
 */
const ScreenReaderAnnouncer = ({ 
  message = '',
  politeness = 'polite' 
}) => {
  const announceRef = useRef(null);
  
  useEffect(() => {
    if (!message || !announceRef.current) return;
    
    // Only make announcement if screen reader messages are enabled
    if (window.screenReaderMessagesEnabled === false) return;
    
    // Set the content of the live region to announce to screen readers
    announceRef.current.textContent = message;
    
    // Clear the announcement after a short delay to prepare for next announcement
    const timeoutId = setTimeout(() => {
      if (announceRef.current) {
        announceRef.current.textContent = '';
      }
    }, 3000);
    
    return () => clearTimeout(timeoutId);
  }, [message]);
  
  // Use role="status" for polite announcements, role="alert" for assertive ones
  return (
    <div 
      ref={announceRef}
      className="sr-only"
      aria-live={politeness}
      aria-atomic="true"
      role={politeness === 'assertive' ? 'alert' : 'status'}
    />
  );
};

export default ScreenReaderAnnouncer;
