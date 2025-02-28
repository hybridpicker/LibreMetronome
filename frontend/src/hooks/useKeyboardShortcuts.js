// src/hooks/useKeyboardShortcuts.js
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
  onManualTempoIncrease
}) => {
  // Store callbacks in refs to ensure latest versions
  const togglePlayRef = useRef(onTogglePlayPause);
  
  // Keep refs updated with latest callback functions
  useEffect(() => {
    togglePlayRef.current = onTogglePlayPause;
  }, [onTogglePlayPause]);
  
  // Debounce flag to prevent multiple rapid triggers
  const isProcessingSpaceRef = useRef(false);
  
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Skip if we're in an input field
      if (event.target.tagName === 'INPUT' || 
          event.target.tagName === 'TEXTAREA' || 
          event.target.isContentEditable) {
        return;
      }

      switch (event.code) {
        case 'Space':
          if (!isProcessingSpaceRef.current && togglePlayRef.current) {
            event.preventDefault(); // Prevent page scrolling
            isProcessingSpaceRef.current = true;
            
            // Direct call to the latest function reference
            togglePlayRef.current();
            
            // Reset the processing flag after a delay
            setTimeout(() => {
              isProcessingSpaceRef.current = false;
            }, 200); // Increased debounce time
          }
          break;
        case 'KeyT':
          if (onTapTempo) onTapTempo();
          break;
        // Number keys for subdivisions
        case 'Digit1': case 'Numpad1':
          if (onSetSubdivisions) onSetSubdivisions(1);
          break;
        case 'Digit2': case 'Numpad2':
          if (onSetSubdivisions) onSetSubdivisions(2);
          break;
        case 'Digit3': case 'Numpad3':
          if (onSetSubdivisions) onSetSubdivisions(3);
          break;
        case 'Digit4': case 'Numpad4':
          if (onSetSubdivisions) onSetSubdivisions(4);
          break;
        case 'Digit5': case 'Numpad5':
          if (onSetSubdivisions) onSetSubdivisions(5);
          break;
        case 'Digit6': case 'Numpad6':
          if (onSetSubdivisions) onSetSubdivisions(6);
          break;
        case 'Digit7': case 'Numpad7':
          if (onSetSubdivisions) onSetSubdivisions(7);
          break;
        case 'Digit8': case 'Numpad8':
          if (onSetSubdivisions) onSetSubdivisions(8);
          break;
        case 'Digit9': case 'Numpad9':
          if (onSetSubdivisions) onSetSubdivisions(9);
          break;
        // Tempo adjustment
        case 'ArrowUp':
          if (onIncreaseTempo) onIncreaseTempo();
          break;
        case 'ArrowDown':
          if (onDecreaseTempo) onDecreaseTempo();
          break;
        // Mode switching
        case 'KeyA':
          if (onSwitchToAnalog) onSwitchToAnalog();
          break;
        case 'KeyC':
          if (onSwitchToCircle) onSwitchToCircle();
          break;
        case 'KeyG':
          if (onSwitchToGrid) onSwitchToGrid();
          break;
        case 'KeyM':
          if (onSwitchToMulti) onSwitchToMulti();
          break;
        case 'KeyI':
          if (onToggleInfoOverlay) onToggleInfoOverlay();
          break;
        case 'Enter':
          if (onManualTempoIncrease) onManualTempoIncrease();
          break;
        default:
          break;
      }
    };

    // Also handle keyup to reset state
    const handleKeyUp = (event) => {
      if (event.code === 'Space') {
        // Don't reset immediately to prevent bounce issues
        setTimeout(() => {
          isProcessingSpaceRef.current = false;
        }, 50);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [
    onTapTempo, onSetSubdivisions, onIncreaseTempo, onDecreaseTempo,
    onSwitchToAnalog, onSwitchToCircle, onSwitchToGrid, onSwitchToMulti,
    onToggleInfoOverlay, onManualTempoIncrease
  ]); // Note: togglePlayRef is not in dependencies - we handle it separately
};

export default useKeyboardShortcuts;