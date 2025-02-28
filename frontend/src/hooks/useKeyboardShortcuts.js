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
  
  // Flag zur Verhinderung mehrfacher Trigger
  const isProcessingSpaceRef = useRef(false);
  const lastSpaceKeyTimeRef = useRef(0);
  
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Falls der Fokus in einem INPUT, TEXTAREA, editierbaren Element oder BUTTON liegt, überspringen
      if (
        event.target.tagName === 'INPUT' ||
        event.target.tagName === 'TEXTAREA' ||
        event.target.isContentEditable ||
        event.target.tagName === 'BUTTON'
      ) {
        return;
      }
      
      if (event.code === 'Space') {
        if (event.repeat) return;
        
        // Zusätzliche Debounce-Logik mit Zeitstempel
        const now = Date.now();
        if (now - lastSpaceKeyTimeRef.current < 500) {
          // Ignoriere Tastendrücke, die zu schnell hintereinander erfolgen (500ms)
          return;
        }
        lastSpaceKeyTimeRef.current = now;
        
        console.log("Space key pressed globally. " + (isProcessingSpaceRef.current ? "(Verarbeitung läuft)" : ""));
        event.preventDefault();
        
        if (!isProcessingSpaceRef.current && togglePlayRef.current) {
          isProcessingSpaceRef.current = true;
          // Verwende requestAnimationFrame, um sicherzustellen, dass der Aufruf außerhalb des Rendering-Zyklus erfolgt
          requestAnimationFrame(() => {
            togglePlayRef.current();
            // Setze die Sperre nach einer Verzögerung zurück
            setTimeout(() => {
              isProcessingSpaceRef.current = false;
            }, 350); // Erhöht von 250ms auf 350ms für mehr Sicherheit
          });
        }
      }
      
      // Weitere Shortcuts
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
