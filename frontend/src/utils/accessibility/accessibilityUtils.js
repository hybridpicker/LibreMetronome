/**
 * Accessibility utilities for LibreMetronome
 */

// Initialize audio context for feedback sounds
let audioContext;

// Initialize on demand to avoid autoplay policy issues
const getAudioContext = () => {
  if (!audioContext) {
    try {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      console.error('Web Audio API not supported:', e);
    }
  }
  return audioContext;
};

/**
 * Play a sound for interface feedback
 * @param {string} type - The type of sound to play ('click', 'start', 'stop', 'warning')
 */
export const playAudioFeedback = (type) => {
  // Only play if audio feedback is enabled
  if (!window.audioFeedbackEnabled) return;
  
  const context = getAudioContext();
  if (!context) return;
  
  // If we can use the metronome's sound function via the window global
  if (window.metronomeDebug && window.metronomeDebug.playSound) {
    try {
      switch (type) {
        case 'click':
          window.metronomeDebug.playSound('normal', 0.3);
          return;
        case 'start':
          window.metronomeDebug.playSound('first', 0.4);
          return;
        case 'stop':
          window.metronomeDebug.playSound('accent', 0.3);
          return;
        case 'warning':
          // Play first sound twice for warning
          window.metronomeDebug.playSound('first', 0.3);
          setTimeout(() => window.metronomeDebug.playSound('first', 0.3), 150);
          return;
        default:
          window.metronomeDebug.playSound('normal', 0.2);
          return;
      }
    } catch (e) {
      console.error('Failed to use metronome sound API:', e);
      // Fall back to oscillator if metronome sound fails
    }
  }
  
  // Fall back to oscillator if metronome sound isn't available
  const oscillator = context.createOscillator();
  const gainNode = context.createGain();
  
  // Configure sound based on type
  switch (type) {
    case 'click':
      oscillator.frequency.value = 800;
      gainNode.gain.value = 0.1;
      oscillator.connect(gainNode);
      gainNode.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.05);
      break;
    case 'start':
      oscillator.frequency.value = 440;
      gainNode.gain.value = 0.2;
      oscillator.connect(gainNode);
      gainNode.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.15);
      break;
    case 'stop':
      oscillator.frequency.value = 330;
      gainNode.gain.value = 0.2;
      oscillator.connect(gainNode);
      gainNode.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.15);
      break;
    case 'warning':
      oscillator.frequency.value = 220;
      gainNode.gain.value = 0.3;
      oscillator.connect(gainNode);
      gainNode.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.3);
      break;
    default:
      oscillator.frequency.value = 600;
      gainNode.gain.value = 0.1;
      oscillator.connect(gainNode);
      gainNode.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.1);
  }
};

/**
 * Announce a message for screen readers
 * @param {string} message - The message to announce
 * @param {string} priority - The priority level ('polite' or 'assertive')
 */
export const announceToScreenReader = (message, priority = 'polite') => {
  // Only announce if screen reader messages are enabled (default is true)
  if (window.screenReaderMessagesEnabled === false) return;

  // Create a new live region element
  const liveRegion = document.createElement('div');
  liveRegion.setAttribute('aria-live', priority);
  liveRegion.setAttribute('aria-atomic', 'true');
  liveRegion.classList.add('sr-only');
  
  // Add to DOM, update content, and remove after announcement
  document.body.appendChild(liveRegion);
  
  // Small delay to ensure screen readers register the new live region
  setTimeout(() => {
    liveRegion.textContent = message;
    
    // Remove after a reasonable time for the screen reader to process
    setTimeout(() => {
      document.body.removeChild(liveRegion);
    }, 3000);
  }, 100);
};

/**
 * Load accessibility settings from localStorage
 * Sets default values if not previously set
 */
export const loadAccessibilitySettings = () => {
  // First, ensure localStorage has been initialized with defaults if needed
  if (localStorage.getItem('accessibility-high-contrast') === null) {
    localStorage.setItem('accessibility-high-contrast', 'false');
  }
  if (localStorage.getItem('accessibility-large-text') === null) {
    localStorage.setItem('accessibility-large-text', 'false');
  }
  if (localStorage.getItem('accessibility-reduced-motion') === null) {
    const preferReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    localStorage.setItem('accessibility-reduced-motion', preferReducedMotion.toString());
  }
  if (localStorage.getItem('accessibility-audio-feedback') === null) {
    localStorage.setItem('accessibility-audio-feedback', 'false');
  }
  if (localStorage.getItem('accessibility-screen-reader-messages') === null) {
    localStorage.setItem('accessibility-screen-reader-messages', 'true');
  }
  if (localStorage.getItem('accessibility-focus-indicators') === null) {
    localStorage.setItem('accessibility-focus-indicators', 'true');
  }
  if (localStorage.getItem('accessibility-haptic-feedback') === null) {
    // Default to true on mobile devices that support vibration
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const hasVibration = 'vibrate' in navigator;
    const defaultHaptic = isTouch && hasVibration;
    localStorage.setItem('accessibility-haptic-feedback', defaultHaptic.toString());
  }
  if (localStorage.getItem('accessibility-color-blind-mode') === null) {
    localStorage.setItem('accessibility-color-blind-mode', 'none');
  }
  
  // Get settings from localStorage
  const settings = {
    highContrast: localStorage.getItem('accessibility-high-contrast') === 'true',
    largeText: localStorage.getItem('accessibility-large-text') === 'true',
    reducedMotion: localStorage.getItem('accessibility-reduced-motion') === 'true',
    audioFeedback: localStorage.getItem('accessibility-audio-feedback') === 'true',
    screenReaderMessages: localStorage.getItem('accessibility-screen-reader-messages') !== 'false',
    focusIndicators: localStorage.getItem('accessibility-focus-indicators') !== 'false',
    hapticFeedback: localStorage.getItem('accessibility-haptic-feedback') === 'true',
    colorBlindMode: localStorage.getItem('accessibility-color-blind-mode')
  };
  
  // Check for system preferences
  const systemPreferences = detectSystemPreferences();
  
  // Apply system preferences if user hasn't explicitly overridden them
  if (localStorage.getItem('accessibility-reduced-motion') !== 'false' && systemPreferences.reducedMotion) {
    settings.reducedMotion = true;
  }
  if (localStorage.getItem('accessibility-high-contrast') !== 'true' && systemPreferences.highContrast) {
    settings.highContrast = true;
  }
  
  // First remove all classes to ensure clean state
  document.body.classList.remove(
    'high-contrast', 
    'large-text', 
    'reduced-motion', 
    'focus-visible-enabled',
    'color-blind',
    'protanopia',
    'deuteranopia',
    'tritanopia',
    'monochromacy'
  );
  
  // Then apply settings to document
  if (settings.highContrast) {
    document.body.classList.add('high-contrast');
  }
  if (settings.largeText) {
    document.body.classList.add('large-text');
  }
  if (settings.reducedMotion) {
    document.body.classList.add('reduced-motion');
  }
  if (settings.focusIndicators) {
    document.body.classList.add('focus-visible-enabled');
  }
  
  // Apply color blind mode if set
  if (settings.colorBlindMode !== 'none') {
    document.body.classList.add('color-blind');
    document.body.classList.add(settings.colorBlindMode);
    
    // Trigger a repaint to ensure SVG filters are applied
    setTimeout(() => {
      // Force SVG elements to repaint by triggering a style recalculation
      const svgElements = document.querySelectorAll('svg');
      svgElements.forEach(svg => {
        // This forces a repaint without changing visual appearance
        svg.style.transform = 'translateZ(0)';
        setTimeout(() => {
          svg.style.transform = '';
        }, 0);
      });
      
      console.log(`Applied color blind mode: ${settings.colorBlindMode} to ${svgElements.length} SVG elements`);
    }, 50);
  }
  
  // Set global flags for other components to use
  window.audioFeedbackEnabled = settings.audioFeedback;
  window.screenReaderMessagesEnabled = settings.screenReaderMessages;
  window.hapticFeedbackEnabled = settings.hapticFeedback;
  window.focusIndicatorsEnabled = settings.focusIndicators;
  
  // Load CSS files dynamically if needed
  if (settings.focusIndicators) {
    ensureStylesheetLoaded('focus-indicators');
  }
  
  if (settings.colorBlindMode !== 'none') {
    ensureStylesheetLoaded('color-blindness');
  }
  
  // Log settings to verify they're being loaded
  console.log('Accessibility settings loaded:', settings);
  console.log('Applied to document.body.classList:', document.body.classList.toString());
  console.log('Window globals set:', {
    audioFeedbackEnabled: window.audioFeedbackEnabled,
    screenReaderMessagesEnabled: window.screenReaderMessagesEnabled,
    hapticFeedbackEnabled: window.hapticFeedbackEnabled,
    focusIndicatorsEnabled: window.focusIndicatorsEnabled
  });
  
  return settings;
};

/**
 * Detect system accessibility preferences from media queries
 * @returns {Object} System preferences
 */
export const detectSystemPreferences = () => {
  // Safe check for matchMedia in test environments
  if (!window.matchMedia || typeof window.matchMedia !== 'function') {
    return {
      reducedMotion: false,
      highContrast: false,
      darkMode: false
    };
  }
  
  try {
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const highContrastQuery = window.matchMedia('(prefers-contrast: more)');
    const msHighContrastQuery = window.matchMedia('(-ms-high-contrast: active)');
    const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    return {
      reducedMotion: reducedMotionQuery && reducedMotionQuery.matches === true,
      highContrast: (highContrastQuery && highContrastQuery.matches === true) || 
                   (msHighContrastQuery && msHighContrastQuery.matches === true),
      darkMode: darkModeQuery && darkModeQuery.matches === true
    };
  } catch (error) {
    console.error("Error detecting system preferences:", error);
    return {
      reducedMotion: false,
      highContrast: false,
      darkMode: false
    };
  }
};

/**
 * Trigger haptic feedback if supported and enabled
 * @param {string} pattern - 'short', 'medium', 'long', 'double', or 'error'
 */
export const triggerHapticFeedback = (pattern = 'short') => {
  if (!window.hapticFeedbackEnabled || !navigator.vibrate) return;
  
  // Define vibration patterns (in milliseconds)
  const patterns = {
    short: [20],
    medium: [50],
    long: [100],
    double: [20, 30, 20],
    error: [50, 100, 50, 100, 50]
  };
  
  // Use the specified pattern or default to short
  const vibrationPattern = patterns[pattern] || patterns.short;
  
  try {
    navigator.vibrate(vibrationPattern);
  } catch (error) {
    console.error('Failed to trigger haptic feedback:', error);
  }
};

/**
 * Ensures a CSS stylesheet is loaded
 * @param {string} name - Name of the CSS file (without extension)
 */
const ensureStylesheetLoaded = (name) => {
  const id = `accessibility-${name}-stylesheet`;
  
  // Check if the stylesheet is already loaded
  if (document.getElementById(id)) return;
  
  // Create a new link element
  const link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  link.type = 'text/css';
  link.href = `/styles/${name}.css`;
  
  // Append to head
  document.head.appendChild(link);
};

/**
 * Get the beat announcement text for screen readers
 * @param {number} beat - Current beat (1-based)
 * @param {number} totalBeats - Total beats in the measure
 * @returns {string} Announcement text
 */
export const getBeatAnnouncement = (beat, totalBeats) => {
  if (beat === 1) {
    return `Beat 1 of ${totalBeats}`;
  } else {
    return `Beat ${beat}`;
  }
};
