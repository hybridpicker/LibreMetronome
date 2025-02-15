// src/hooks/KeyboardShortcuts.js
import { useEffect } from 'react';

/**
 * Custom hook to handle global keyboard shortcuts.
 *
 * @param {Object} callbacks - Callback functions for the keyboard actions.
 * @param {Function} callbacks.onTogglePlayPause - Called when Space gedrückt wird.
 * @param {Function} callbacks.onTapTempo - Called when T gedrückt wird.
 * @param {Function} callbacks.onSetSubdivisions - Called bei Zifferntasten (1–9).
 * @param {Function} callbacks.onIncreaseTempo - Erhöht das Tempo (Right Arrow).
 * @param {Function} callbacks.onDecreaseTempo - Verringert das Tempo (Left Arrow).
 * @param {Function} callbacks.onSwitchToAnalog - Wechselt in den Analog Mode (A).
 * @param {Function} callbacks.onSwitchToCircle - Wechselt in den Circle Mode (C).
 * @param {Function} callbacks.onSwitchToGrid - Wechselt in den Grid Mode (G).
 * @param {Function} callbacks.onToggleInfoOverlay - Zeigt oder versteckt das Info Overlay (I).
 */
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
}) => {
  useEffect(() => {
    const handleKeydown = (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        onTogglePlayPause && onTogglePlayPause();
      } else if (e.key.toLowerCase() === 't') {
        onTapTempo && onTapTempo();
      } else if (e.key >= '1' && e.key <= '9') {
        onSetSubdivisions && onSetSubdivisions(parseInt(e.key, 10));
      } else if (e.key === 'ArrowRight') {
        onIncreaseTempo && onIncreaseTempo();
      } else if (e.key === 'ArrowLeft') {
        onDecreaseTempo && onDecreaseTempo();
      } else if (e.key.toLowerCase() === 'a') {
        onSwitchToAnalog && onSwitchToAnalog();
      } else if (e.key.toLowerCase() === 'c') {
        onSwitchToCircle && onSwitchToCircle();
      } else if (e.key.toLowerCase() === 'g') {
        onSwitchToGrid && onSwitchToGrid();
      } else if (e.key.toLowerCase() === 'i') {
        onToggleInfoOverlay && onToggleInfoOverlay();
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
  ]);
};

export default useKeyboardShortcuts;
