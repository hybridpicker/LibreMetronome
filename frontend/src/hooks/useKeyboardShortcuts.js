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
  onToggleInfoOverlay,
  onManualTempoIncrease,
}) => {
  const lastToggleTimeRef = useRef(0);
  const DEBOUNCE_MS = 300;

  useEffect(() => {
    const handleKeydown = (e) => {
      if (e.repeat) return;
      if (e.code === 'Space') {
        const now = Date.now();
        if (now - lastToggleTimeRef.current < DEBOUNCE_MS) return;
        lastToggleTimeRef.current = now;
        e.preventDefault();
        onTogglePlayPause && onTogglePlayPause();
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
    onToggleInfoOverlay,
    onManualTempoIncrease,
  ]);
};

export default useKeyboardShortcuts;
