/**
 * Accessibility utilities for LibreMetronome
 */

// Initialize audio context for feedback sounds
let audioContext;

// Initialize on demand to avoid autoplay policy issues
const getAudioContext = () => {
  if (!audioContext) {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        audioContext = new AudioContext();
      }
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
  if (window.metronomeDebug && typeof window.metronomeDebug.playSound === 'function') {
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
  if (!context.createOscillator || typeof context.createOscillator !== 'function') {
    console.error('Audio context does not support createOscillator');
    return;
  }
  
  try {
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
  } catch (e) {
    console.error('Failed to create oscillator:', e);
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

  try {
    // Create a new live region element
    const liveRegion = document.createElement('div');
    if (!liveRegion) return;
    
    liveRegion.setAttribute('aria-live', priority);
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.classList.add('sr-only');
    
    // Store a reference to the element in a way that works in test environment
    const elementRef = liveRegion;
    
    // Add to DOM, update content, and remove after announcement
    document.body.appendChild(elementRef);
    
    // Small delay to ensure screen readers register the new live region
    setTimeout(() => {
      elementRef.textContent = message;
      
      // Remove after a reasonable time for the screen reader to process
      setTimeout(() => {
        try {
          // Use this safer approach for test environments
          if (document.body && document.body.contains) {
            // First check if the function exists and is callable
            try {
              const isInDocument = document.body.contains(elementRef);
              if (isInDocument) {
                document.body.removeChild(elementRef);
              }
            } catch (err) {
              // In some test environments, contains might throw
              // Try removing it anyway as a fallback
              try {
                document.body.removeChild(elementRef);
              } catch (innerErr) {
                // If we can't remove it either way, just log and continue
                console.log('Could not remove screen reader element, might be in test env');
              }
            }
          }
        } catch (e) {
          console.error('Error removing screen reader element:', e);
        }
      }, 3000);
    }, 100);
  } catch (e) {
    console.error('Error announcing to screen reader:', e);
  }
};

/**
 * Load accessibility settings from localStorage
 * Sets default values if not previously set
 */
export const loadAccessibilitySettings = () => {
  try {
    // First, ensure localStorage has been initialized with defaults if needed
    if (localStorage.getItem('accessibility-high-contrast') === null) {
      localStorage.setItem('accessibility-high-contrast', 'false');
    }
    if (localStorage.getItem('accessibility-large-text') === null) {
      localStorage.setItem('accessibility-large-text', 'false');
    }
    if (localStorage.getItem('accessibility-reduced-motion') === null) {
      const systemPrefs = detectSystemPreferences();
      localStorage.setItem('accessibility-reduced-motion', systemPrefs.reducedMotion.toString());
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
    if (localStorage.getItem('accessibility-high-contrast') !== 'false' && systemPreferences.highContrast) {
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
    
    // Apply settings to document and specific elements
    if (settings.highContrast) {
      document.body.classList.add('high-contrast');
      
      // Apply to specific elements as well
      document.querySelectorAll('.metronome-container, .metronome-canvas, .metronome-controls, header, footer, canvas, svg').forEach(el => {
        el.classList.add('high-contrast');
      });
      
      // Handle SVGs and Canvas specifically for high contrast mode
      document.querySelectorAll('svg').forEach(svg => {
        // Apply styles directly to SVG elements
        svg.style.filter = 'brightness(2) contrast(1.5)';
        
        // For each individual SVG element
        const paths = svg.querySelectorAll('path, circle, rect, line, polygon');
        paths.forEach(path => {
          path.setAttribute('stroke', '#FFFFFF');
          path.setAttribute('stroke-width', '2');
          if (!path.getAttribute('fill') || path.getAttribute('fill') === 'none') {
            path.setAttribute('fill', 'none');
          } else {
            path.setAttribute('fill', '#000000');
          }
        });
      });
      
      // Apply high contrast mode to Canvas
      document.querySelectorAll('canvas').forEach(canvas => {
        canvas.style.filter = 'brightness(2) contrast(1.5) invert(1)';
      });
    }
    
    if (settings.largeText) {
      document.body.classList.add('large-text');
      
      // Apply to text elements
      document.querySelectorAll('.control-section, .tempo-display, .beats-display, header, footer').forEach(el => {
        el.classList.add('large-text');
      });
    }
    
    if (settings.reducedMotion) {
      document.body.classList.add('reduced-motion');
      
      // Apply to animation elements
      document.querySelectorAll('.metronome-container, .metronome-canvas, .circle-display, .analog-display').forEach(el => {
        el.classList.add('reduced-motion');
      });
    }
    
    if (settings.focusIndicators) {
      document.body.classList.add('focus-visible-enabled');
    }
    
    // Apply color blind mode if set
    if (settings.colorBlindMode && settings.colorBlindMode !== 'none') {
      document.body.classList.add('color-blind');
      document.body.classList.add(settings.colorBlindMode);
      
      // Apply to specific elements
      const elements = document.querySelectorAll('.metronome-container, .metronome-canvas, .metronome-controls, header, footer, .circle-display, .analog-display, .beat-grid');
      elements.forEach(el => {
        el.classList.add('color-blind', settings.colorBlindMode);
      });
      
      // Preserve the app's viewport/scaling in color blind mode
      // Add a specific class to control the viewport scaling
      document.body.classList.add('preserve-viewport');
      
      // Trigger a repaint to ensure SVG filters are applied
      setTimeout(() => {
        try {
          // Force SVG elements to repaint by triggering a style recalculation
          const svgElements = document.querySelectorAll('svg');
          svgElements.forEach(svg => {
            // This forces a repaint without modifying dimensions
            svg.style.transform = 'translateZ(0)';
            setTimeout(() => {
              svg.style.transform = '';
            }, 0);
          });
          
          // Force canvas elements to repaint
          const canvasElements = document.querySelectorAll('canvas');
          canvasElements.forEach(canvas => {
            canvas.style.transform = 'translateZ(0)';
            setTimeout(() => {
              canvas.style.transform = '';
            }, 0);
          });
          
          // Force metronome container repaint without scaling issues
          const metronomeContainer = document.querySelector('.metronome-container');
          if (metronomeContainer) {
            // Ensure proper dimensions are maintained
            metronomeContainer.style.transform = 'translateZ(0)';
            metronomeContainer.style.width = '';
            metronomeContainer.style.height = '';
            setTimeout(() => {
              metronomeContainer.style.transform = '';
            }, 0);
          }
          
          console.log(`Applied color blind mode: ${settings.colorBlindMode} to ${svgElements.length} SVG elements and ${canvasElements.length} canvas elements`);
        } catch (e) {
          console.error('Error applying color blind mode to elements:', e);
        }
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
      ensureStylesheetLoaded('play-button-colorblind-fix');
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
  } catch (e) {
    console.error('Error loading accessibility settings:', e);
    
    // Return default settings if there was an error
    return {
      highContrast: false,
      largeText: false,
      reducedMotion: false,
      audioFeedback: false,
      screenReaderMessages: true,
      focusIndicators: true,
      hapticFeedback: false,
      colorBlindMode: 'none'
    };
  }
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
  if (!window.hapticFeedbackEnabled) return;
  if (!navigator.vibrate || typeof navigator.vibrate !== 'function') return;
  
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
  
  try {
    // Check if the stylesheet is already loaded
    if (document.getElementById(id)) return;
    
    // Create a new link element
    const link = document.createElement('link');
    if (!link) return;
    
    link.id = id;
    link.rel = 'stylesheet';
    link.type = 'text/css';
    link.href = `/styles/${name}.css`;
    
    // Only append if we have access to document.head
    if (document.head) {
      document.head.appendChild(link);
    }
  } catch (e) {
    console.error(`Error loading stylesheet ${name}:`, e);
  }
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
