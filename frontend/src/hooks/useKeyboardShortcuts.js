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
  // Speichern der Callback-Funktionen in Refs
  const togglePlayRef = useRef(onTogglePlayPause);
  const tapTempoRef = useRef(onTapTempo);
  
  useEffect(() => {
    togglePlayRef.current = onTogglePlayPause;
  }, [onTogglePlayPause]);
  
  useEffect(() => {
    tapTempoRef.current = onTapTempo;
  }, [onTapTempo]);
  
  // Remove the isProcessingSpaceRef and implement a more robust handler
  const lastSpaceKeyTimeRef = useRef(0);
  
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Prevent keyboard shortcuts when typing in inputs or editable elements
      if (
        event.target.tagName === 'INPUT' ||
        event.target.tagName === 'TEXTAREA' ||
        event.target.isContentEditable ||
        event.target.tagName === 'BUTTON'
      ) {
        return;
      }
      
      // Space bar handling
      if (event.code === 'Space') {
        // Prevent default scrolling
        event.preventDefault();
        
        // Prevent rapid repeated calls
        const now = Date.now();
        if (now - lastSpaceKeyTimeRef.current < 300) {
          return;
        }
        lastSpaceKeyTimeRef.current = now;
        
        // Call toggle play/pause
        if (togglePlayRef.current) {
          togglePlayRef.current();
        }
      }
      
      // Other shortcuts remain the same
      switch (event.code) {
        case 'KeyT':
          console.log("Key T pressed for Tap Tempo.");
          if (tapTempoRef.current) tapTempoRef.current();
          break;
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
        case 'ArrowUp':
        case 'ArrowRight':
          if (onIncreaseTempo) onIncreaseTempo();
          break;
        case 'ArrowDown':
        case 'ArrowLeft':
          if (onDecreaseTempo) onDecreaseTempo();
          break;
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
        case 'KeyU':
          if (onManualTempoIncrease) onManualTempoIncrease();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    onSetSubdivisions, onIncreaseTempo, onDecreaseTempo,
    onSwitchToAnalog, onSwitchToCircle, onSwitchToGrid, onSwitchToMulti,
    onToggleInfoOverlay, onManualTempoIncrease
  ]);
};

export default useKeyboardShortcuts;