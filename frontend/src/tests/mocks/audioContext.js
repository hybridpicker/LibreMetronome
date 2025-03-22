// src/tests/mocks/audioContext.js
/**
 * Mock implementation of Web Audio API for testing
 */

class MockOscillator {
  constructor() {
    this.frequency = { value: 0 };
    this.type = 'sine';
  }

  connect(node) {
    return node;
  }

  start(when = 0) {}

  stop(when = 0) {}

  disconnect() {}
}

class MockGainNode {
  constructor() {
    this.gain = { 
      value: 1,
      setValueAtTime: jest.fn(),
      linearRampToValueAtTime: jest.fn(),
      exponentialRampToValueAtTime: jest.fn()
    };
  }

  connect(node) {
    return node;
  }

  disconnect() {}
}

class MockAudioContext {
  constructor(options = {}) {
    this.state = 'running';
    this.currentTime = 0;
    this.sampleRate = options.sampleRate || 44100;
    this.destination = {};
    this.latencyHint = options.latencyHint || 'interactive';
    
    // Advance time periodically for more realistic behavior
    setInterval(() => {
      this.currentTime += 0.01;
    }, 10);
  }

  createOscillator() {
    return new MockOscillator();
  }

  createGain() {
    return new MockGainNode();
  }

  resume() {
    this.state = 'running';
    return Promise.resolve();
  }

  suspend() {
    this.state = 'suspended';
    return Promise.resolve();
  }

  close() {
    this.state = 'closed';
    return Promise.resolve();
  }
}

// Set up global mocks
global.AudioContext = MockAudioContext;
global.webkitAudioContext = MockAudioContext;

// Set up window level mocks
if (typeof window !== 'undefined') {
  window.AudioContext = MockAudioContext;
  window.webkitAudioContext = MockAudioContext;
  
  // Create and store the audio context instance that App.js uses
  window._audioContextInit = new MockAudioContext({
    sampleRate: 48000,
    latencyHint: 'interactive'
  });
  
  // Create the audio context instance that components use
  window.audioContext = new MockAudioContext();
}

export { MockAudioContext, MockOscillator, MockGainNode };
