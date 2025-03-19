// src/tests/metronome/SoundLoadingTest.test.js
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

// Create a mock AudioBuffer for tests
class AudioBuffer {
  constructor({ length, sampleRate }) {
    this.length = length;
    this.sampleRate = sampleRate;
    this.duration = length / sampleRate;
    this.numberOfChannels = 1;
  }
  
  getChannelData() {
    return new Float32Array(this.length);
  }
}

// Mock for AudioContext to track creation and usage
let mockAudioContextInstances = [];
class MockAudioContext {
  constructor() {
    this.state = 'suspended';
    this.currentTime = 0;
    this.destination = {};
    this.sampleRate = 44100;
    
    // Add to instances for tracking
    mockAudioContextInstances.push(this);
    
    // Update mock counters
    MockAudioContext.instanceCount++;
    
    // Auto-incrementing ID for tracking
    this.id = MockAudioContext.instanceCount;
    
    // Call tracking
    this.methodCalls = {
      resume: 0,
      suspend: 0,
      close: 0,
      createBufferSource: 0,
      createGain: 0,
      decodeAudioData: 0
    };
  }
  
  resume() {
    this.methodCalls.resume++;
    this.state = 'running';
    return Promise.resolve();
  }
  
  suspend() {
    this.methodCalls.suspend++;
    this.state = 'suspended';
    return Promise.resolve();
  }
  
  close() {
    this.methodCalls.close++;
    this.state = 'closed';
    return Promise.resolve();
  }
  
  createBufferSource() {
    this.methodCalls.createBufferSource++;
    return {
      connect: jest.fn().mockReturnThis(),
      disconnect: jest.fn(),
      start: jest.fn(),
      stop: jest.fn(),
      buffer: null
    };
  }
  
  createGain() {
    this.methodCalls.createGain++;
    return {
      connect: jest.fn().mockReturnThis(),
      disconnect: jest.fn(),
      gain: {
        value: 1,
        setValueAtTime: jest.fn(),
        linearRampToValueAtTime: jest.fn()
      }
    };
  }
  
  decodeAudioData() {
    this.methodCalls.decodeAudioData++;
    return Promise.resolve(new AudioBuffer({ length: 1000, sampleRate: 44100 }));
  }
  
  // Static properties for tracking
  static instanceCount = 0;
  static resetCount() {
    MockAudioContext.instanceCount = 0;
    mockAudioContextInstances = [];
  }
}

// Mock App component to avoid importing the real one
jest.mock('../../App', () => {
  return function MockedApp() {
    return <div>Mocked App</div>;
  };
});

// Create separate mock function for loadClickBuffers
const mockLoadClickBuffers = jest.fn().mockImplementation(async ({ 
  audioCtx, 
  normalBufferRef, 
  accentBufferRef, 
  firstBufferRef, 
  soundSet 
}) => {
  // Simulate loading audio buffers
  normalBufferRef.current = new AudioBuffer({ length: 1000, sampleRate: 44100 });
  accentBufferRef.current = new AudioBuffer({ length: 1000, sampleRate: 44100 });
  firstBufferRef.current = new AudioBuffer({ length: 1000, sampleRate: 44100 });
  
  return {
    normalBuffer: normalBufferRef.current,
    accentBuffer: accentBufferRef.current,
    firstBuffer: firstBufferRef.current
  };
});

// Mock the audioBuffers module
jest.mock('../../hooks/useMetronomeLogic/audioBuffers', () => {
  // Using a function that returns an object ensures the mock is created with the correct reference
  const audioBuffers = {
    initAudioContext: jest.fn(() => new MockAudioContext()),
    loadClickBuffers: jest.fn().mockImplementation(
      async ({ normalBufferRef, accentBufferRef, firstBufferRef }) => {
        normalBufferRef.current = {};
        accentBufferRef.current = {};
        firstBufferRef.current = {};
        return { normalBuffer: {}, accentBuffer: {}, firstBuffer: {} };
      }
    )
  };
  return audioBuffers;
});

// Mock the sound set service
jest.mock('../../services/soundSetService', () => ({
  getActiveSoundSet: jest.fn().mockResolvedValue({
    name: 'Default',
    normal: 'clickNormal.mp3',
    accent: 'clickAccent.mp3',
    first: 'clickFirst.mp3'
  })
}));

// Mock fetch for any audio file loading
global.fetch = jest.fn().mockImplementation((url) => {
  return Promise.resolve({
    ok: true,
    status: 200,
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(1000))
  });
});

// Create a utility for tracking sound loading
class SoundLoadTracker {
  constructor() {
    this.loadEvents = [];
    this.errorEvents = [];
    this.startTime = Date.now();
    
    // Bind methods
    this.trackLoad = this.trackLoad.bind(this);
    this.trackError = this.trackError.bind(this);
    this.reset = this.reset.bind(this);
  }
  
  trackLoad(event) {
    this.loadEvents.push({
      time: Date.now() - this.startTime,
      detail: event.detail || {},
      mode: event.detail?.mode || 'unknown'
    });
  }
  
  trackError(event) {
    this.errorEvents.push({
      time: Date.now() - this.startTime,
      detail: event.detail || {},
      error: event.detail?.error || 'unknown error',
      mode: event.detail?.mode || 'unknown'
    });
  }
  
  reset() {
    this.loadEvents = [];
    this.errorEvents = [];
    this.startTime = Date.now();
  }
  
  getStats() {
    return {
      loadEvents: this.loadEvents,
      errorEvents: this.errorEvents,
      totalLoads: this.loadEvents.length,
      totalErrors: this.errorEvents.length,
      duration: Date.now() - this.startTime
    };
  }
}

// Test component to dispatch sound loading events
function SoundLoadingMonitor() {
  React.useEffect(() => {
    const tracker = new SoundLoadTracker();
    
    // Listen for sound loading events
    window.addEventListener('metronome-sounds-loaded', tracker.trackLoad);
    window.addEventListener('metronome-sounds-error', tracker.trackError);
    
    // Expose tracker to window for test access
    window.soundLoadTracker = tracker;
    
    return () => {
      window.removeEventListener('metronome-sounds-loaded', tracker.trackLoad);
      window.removeEventListener('metronome-sounds-error', tracker.trackError);
      delete window.soundLoadTracker;
    };
  }, []);
  
  return null;
}

/**
 * Custom matcher for checking sound loading
 */
expect.extend({
  toHaveLoadedSoundsForMode(tracker, mode) {
    const modeLoads = tracker.loadEvents.filter(ev => ev.mode === mode);
    const pass = modeLoads.length > 0;
    
    return {
      pass,
      message: () => pass
        ? `Expected sound tracker not to have loaded sounds for mode "${mode}", but it did`
        : `Expected sound tracker to have loaded sounds for mode "${mode}", but none were found`
    };
  }
});

/**
 * Test suite for verifying sound loading across different metronome modes
 */
describe('Metronome Sound Loading Tests', () => {
  // Reset before each test
  beforeEach(() => {
    // Reset mocks and counters
    jest.clearAllMocks();
    MockAudioContext.resetCount();
    
    // Create global dispatch function for simulating sound events
    window.dispatchSoundLoaded = (mode) => {
      window.dispatchEvent(new CustomEvent('metronome-sounds-loaded', {
        detail: { mode, timestamp: Date.now() }
      }));
    };
    
    window.dispatchSoundError = (mode, error) => {
      window.dispatchEvent(new CustomEvent('metronome-sounds-error', {
        detail: { mode, error, timestamp: Date.now() }
      }));
    };
  });
  
  // Clean up after each test
  afterEach(() => {
    delete window.dispatchSoundLoaded;
    delete window.dispatchSoundError;
    if (window.soundLoadTracker) {
      delete window.soundLoadTracker;
    }
  });
  
  /**
   * Basic test to verify the sound loading tracker works
   */
  test('Sound loading tracker should record events', async () => {
    // Render the SoundLoadingMonitor component
    render(<SoundLoadingMonitor />);
    
    // Wait for the monitor to be ready
    await waitFor(() => expect(window.soundLoadTracker).toBeDefined());
    
    // Dispatch test events
    window.dispatchSoundLoaded('test-mode');
    window.dispatchSoundError('test-mode', 'Test error');
    
    // Check that events were recorded
    await waitFor(() => {
      const stats = window.soundLoadTracker.getStats();
      expect(stats.totalLoads).toBe(1);
      expect(stats.totalErrors).toBe(1);
      expect(window.soundLoadTracker).toHaveLoadedSoundsForMode('test-mode');
    });
  });
});