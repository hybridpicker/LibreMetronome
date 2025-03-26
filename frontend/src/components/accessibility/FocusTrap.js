import React, { useEffect, useRef } from 'react';
import { playAudioFeedback } from '../../utils/accessibility/accessibilityUtils';

/**
 * FocusTrap component for managing focus within modals, dialogs, and menus
 * Ensures focus is trapped inside the component when open
 * Returns focus to the trigger element when closed
 * 
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 * @param {boolean} props.isActive - Whether the focus trap is active
 * @param {React.RefObject} props.triggerRef - Ref to the element that triggered the trap (to restore focus later)
 * @param {Function} props.onEscape - Function to call when Escape key is pressed
 */
const FocusTrap = ({ children, isActive, triggerRef, onEscape }) => {
  const trapRef = useRef(null);
  const lastFocusableElementRef = useRef(null);
  const firstFocusableElementRef = useRef(null);
  
  // Store the element that had focus before the trap was activated
  const previousFocusRef = useRef(null);
  
  useEffect(() => {
    // Only run effects when trap is active
    if (!isActive || !trapRef.current) return;
    
    // Store current focused element to restore later
    previousFocusRef.current = triggerRef?.current || document.activeElement;
    
    // Get all focusable elements within the trap
    const focusableElements = Array.from(
      trapRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
    ).filter(el => !el.hasAttribute('disabled') && !el.getAttribute('aria-hidden'));
    
    if (focusableElements.length === 0) return;
    
    // Store first and last focusable elements for cycling focus
    firstFocusableElementRef.current = focusableElements[0];
    lastFocusableElementRef.current = focusableElements[focusableElements.length - 1];
    
    // Automatically focus the first focusable element
    firstFocusableElementRef.current.focus();
    if (window.audioFeedbackEnabled) {
      playAudioFeedback('click');
    }
    
    // Handle keyboard events
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && onEscape) {
        e.preventDefault();
        onEscape();
        return;
      }
      
      // Trap focus within component
      if (e.key === 'Tab') {
        // If Shift+Tab pressed on first element, move to last element
        if (e.shiftKey && document.activeElement === firstFocusableElementRef.current) {
          e.preventDefault();
          lastFocusableElementRef.current.focus();
          return;
        }
        
        // If Tab pressed on last element, move to first element
        if (!e.shiftKey && document.activeElement === lastFocusableElementRef.current) {
          e.preventDefault();
          firstFocusableElementRef.current.focus();
          return;
        }
      }
    };
    
    // Add event listener
    document.addEventListener('keydown', handleKeyDown);
    
    // Cleanup function
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      
      // Restore focus to previous element when trap is deactivated
      if (previousFocusRef.current && isActive) {
        setTimeout(() => {
          previousFocusRef.current.focus();
          if (window.audioFeedbackEnabled) {
            playAudioFeedback('click');
          }
        }, 0);
      }
    };
  }, [isActive, onEscape, triggerRef]);
  
  return (
    <div ref={trapRef} className="focus-trap">
      {children}
    </div>
  );
};

export default FocusTrap;
