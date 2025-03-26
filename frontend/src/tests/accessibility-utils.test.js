// Unit tests for accessibility utilities
import { 
  loadAccessibilitySettings, 
  announceToScreenReader, 
  playAudioFeedback, 
  getBeatAnnouncement 
} from '../utils/accessibility/accessibilityUtils';

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: jest.fn(key => store[key] || null),
    setItem: jest.fn((key, value) => {
      store[key] = value.toString();
    }),
    clear: jest.fn(() => {
      store = {};
    }),
    removeItem: jest.fn(key => {
      delete store[key];
    }),
  };
})();

// Mock document body classList
document.body.classList = {
  toggle: jest.fn(),
};

// Mock audio context
window.AudioContext = jest.fn().mockImplementation(() => ({
  createOscillator: jest.fn().mockImplementation(() => ({
    connect: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
    frequency: {
      value: 0
    }
  })),
  createGain: jest.fn().mockImplementation(() => ({
    connect: jest.fn(),
    gain: {
      value: 0
    }
  })),
  destination: {},
  currentTime: 0
}));

// Mock DOM methods for screen reader announcer
document.createElement = jest.fn().mockImplementation(() => ({
  setAttribute: jest.fn(),
  classList: {
    add: jest.fn()
  },
  textContent: ''
}));
document.body.appendChild = jest.fn();
document.body.removeChild = jest.fn();

// Mock window.matchMedia
window.matchMedia = jest.fn().mockImplementation(query => ({
  matches: false,
  media: query,
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
}));

// Mock metronome sound API
window.metronomeDebug = {
  audioBuffers: { first: {}, normal: {}, accent: {} },
  audioContext: {},
  playSound: jest.fn()
};

describe('Accessibility Utils', () => {
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Restore default object state
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock
    });
    
    window.audioFeedbackEnabled = undefined;
    window.screenReaderMessagesEnabled = undefined;
  });

  describe('loadAccessibilitySettings', () => {
    test('loads default settings when nothing in localStorage', () => {
      const settings = loadAccessibilitySettings();
      
      expect(settings.highContrast).toBe(false);
      expect(settings.largeText).toBe(false);
      expect(settings.reducedMotion).toBe(false);
      expect(settings.audioFeedback).toBe(false);
      expect(settings.screenReaderMessages).toBe(true);
      
      expect(document.body.classList.toggle).toHaveBeenCalledWith('high-contrast', false);
      expect(document.body.classList.toggle).toHaveBeenCalledWith('large-text', false);
      expect(document.body.classList.toggle).toHaveBeenCalledWith('reduced-motion', false);
      
      expect(window.audioFeedbackEnabled).toBe(false);
      expect(window.screenReaderMessagesEnabled).toBe(true);
    });
    
    test('loads settings from localStorage', () => {
      // Set up localStorage with mock values
      localStorageMock.getItem.mockImplementation(key => {
        if (key === 'accessibility-high-contrast') return 'true';
        if (key === 'accessibility-large-text') return 'true';
        if (key === 'accessibility-reduced-motion') return 'true';
        if (key === 'accessibility-audio-feedback') return 'true';
        if (key === 'accessibility-screen-reader-messages') return 'false';
        return null;
      });
      
      const settings = loadAccessibilitySettings();
      
      expect(settings.highContrast).toBe(true);
      expect(settings.largeText).toBe(true);
      expect(settings.reducedMotion).toBe(true);
      expect(settings.audioFeedback).toBe(true);
      expect(settings.screenReaderMessages).toBe(false);
      
      expect(document.body.classList.toggle).toHaveBeenCalledWith('high-contrast', true);
      expect(document.body.classList.toggle).toHaveBeenCalledWith('large-text', true);
      expect(document.body.classList.toggle).toHaveBeenCalledWith('reduced-motion', true);
      
      expect(window.audioFeedbackEnabled).toBe(true);
      expect(window.screenReaderMessagesEnabled).toBe(false);
    });
    
    test('respects system reduced motion preference', () => {
      // Mock matchMedia to simulate reduced motion preference
      window.matchMedia = jest.fn().mockImplementation(query => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      }));
      
      const settings = loadAccessibilitySettings();
      
      expect(settings.reducedMotion).toBe(true);
      expect(document.body.classList.toggle).toHaveBeenCalledWith('reduced-motion', true);
    });
  });
  
  describe('announceToScreenReader', () => {
    test('creates live region when screen reader messages enabled', () => {
      window.screenReaderMessagesEnabled = true;
      
      announceToScreenReader('Test message', 'polite');
      
      expect(document.createElement).toHaveBeenCalled();
      expect(document.body.appendChild).toHaveBeenCalled();
      
      // Fast-forward timers to test removal
      jest.runAllTimers();
      expect(document.body.removeChild).toHaveBeenCalled();
    });
    
    test('does nothing when screen reader messages disabled', () => {
      window.screenReaderMessagesEnabled = false;
      
      announceToScreenReader('Test message', 'polite');
      
      expect(document.createElement).not.toHaveBeenCalled();
      expect(document.body.appendChild).not.toHaveBeenCalled();
    });
  });
  
  describe('playAudioFeedback', () => {
    test('uses metronome sound API when available', () => {
      window.audioFeedbackEnabled = true;
      
      playAudioFeedback('first');
      
      expect(window.metronomeDebug.playSound).toHaveBeenCalledWith('first', expect.any(Number));
    });
    
    test('falls back to oscillator when metronome sound API unavailable', () => {
      window.audioFeedbackEnabled = true;
      window.metronomeDebug = null;
      
      playAudioFeedback('click');
      
      expect(window.AudioContext).toHaveBeenCalled();
      const mockAudioContext = window.AudioContext.mock.results[0].value;
      expect(mockAudioContext.createOscillator).toHaveBeenCalled();
      expect(mockAudioContext.createGain).toHaveBeenCalled();
    });
    
    test('does nothing when audio feedback is disabled', () => {
      window.audioFeedbackEnabled = false;
      
      playAudioFeedback('click');
      
      expect(window.AudioContext).not.toHaveBeenCalled();
      expect(window.metronomeDebug.playSound).not.toHaveBeenCalled();
    });
    
    test('handles different sound types correctly', () => {
      window.audioFeedbackEnabled = true;
      window.metronomeDebug = null;
      
      // Test each sound type
      playAudioFeedback('click');
      playAudioFeedback('start');
      playAudioFeedback('stop');
      playAudioFeedback('warning');
      
      // Should create an oscillator for each call
      expect(window.AudioContext).toHaveBeenCalledTimes(4);
    });
  });
  
  describe('getBeatAnnouncement', () => {
    test('announces first beat with total beats', () => {
      const message = getBeatAnnouncement(1, 4);
      expect(message).toBe('Beat 1 of 4');
    });
    
    test('announces other beats without total', () => {
      const message = getBeatAnnouncement(2, 4);
      expect(message).toBe('Beat 2');
    });
    
    test('handles single beat measures', () => {
      const message = getBeatAnnouncement(1, 1);
      expect(message).toBe('Beat 1 of 1');
    });
  });
});
