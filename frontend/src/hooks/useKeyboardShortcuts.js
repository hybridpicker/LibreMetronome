// File: src/hooks/useKeyboardShortcuts.js
import { useEffect, useRef } from 'react';

const useKeyboardShortcuts = ({
  onTogglePlayPause,
  onTapTempo,
  onSetSubdivisions,
  onIncreaseTempo,
  onDecreaseTempo,
  onSwitchToAnalog,
  onSwitchToCircle,
  onSwitchToGrid,
  onSwitchToMulti,
  onToggleInfoOverlay,
  onManualTempoIncrease,
}) => {
  // Extremely robust debounce for play/pause
  const isProcessingRef = useRef(false);
  const lastToggleTimeRef = useRef(0);
  const DEBOUNCE_MS = 500; // Increased from 300ms to 500ms

  useEffect(() => {
    const handleKeydown = (e) => {
      if (e.repeat) return;
      
      if (e.code === 'Space') {
        // Prevent default to avoid page scrolling
        e.preventDefault();
        
        // Extremely robust debounce for play/pause
        const now = Date.now();
        if (now - lastToggleTimeRef.current < DEBOUNCE_MS || isProcessingRef.current) {
          console.log("[KeyboardShortcuts] Ignoring space key - debounce or already processing");
          return;
        }
        
        // Set processing flag to prevent multiple calls
        isProcessingRef.current = true;
        lastToggleTimeRef.current = now;
        
        // CRITICAL: Use a longer delay to ensure we're not interfering with any ongoing processes
        console.log("[KeyboardShortcuts] Space key pressed, will process after delay");
        
        // Use a much longer delay to ensure we're not interfering with any ongoing processes
        setTimeout(() => {
          if (onTogglePlayPause) {
            console.log("[KeyboardShortcuts] Calling toggle play/pause from keyboard");
            onTogglePlayPause();
          }
          
          // Release the processing flag after a much longer delay
          setTimeout(() => {
            isProcessingRef.current = false;
            console.log("[KeyboardShortcuts] Released processing flag");
          }, 300); // Increased from 100ms to 300ms
        }, 100); // Increased from 10ms to 100ms
        
        return;
      }
      switch (e.code) {
        case 'ArrowRight':
          onIncreaseTempo && onIncreaseTempo();
          break;
        case 'ArrowLeft':
          onDecreaseTempo && onDecreaseTempo();
          break;
        default: {
          const key = e.key.toLowerCase();
          if (key === 't') onTapTempo && onTapTempo();
          else if (key >= '1' && key <= '9') onSetSubdivisions && onSetSubdivisions(parseInt(e.key, 10));
          else if (key === 'a') onSwitchToAnalog && onSwitchToAnalog();
          else if (key === 'c') onSwitchToCircle && onSwitchToCircle();
          else if (key === 'g') onSwitchToGrid && onSwitchToGrid();
          else if (key === 'm') onSwitchToMulti && onSwitchToMulti();
          else if (key === 'i') onToggleInfoOverlay && onToggleInfoOverlay();
          else if (key === 'u') onManualTempoIncrease && onManualTempoIncrease();
          break;
        }
      }
    };

    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [
    onTogglePlayPause,
    onTapTempo,
    onSetSubdivisions,
    onIncreaseTempo,
    onDecreaseTempo,
    onSwitchToAnalog,
    onSwitchToCircle,
    onSwitchToGrid,
    onSwitchToMulti,
    onToggleInfoOverlay,
    onManualTempoIncrease,
  ]);
};

export default useKeyboardShortcuts;
