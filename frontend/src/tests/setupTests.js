// src/tests/setupTests.js
// This file is run before each test

// Import audio context mocks to ensure they're available globally
import './mocks/audioContext';

// Mock requestAnimationFrame and cancelAnimationFrame
global.requestAnimationFrame = jest.fn((callback) => {
  return setTimeout(() => callback(Date.now()), 0);
});

global.cancelAnimationFrame = jest.fn((id) => {
  clearTimeout(id);
});

// Mock performance.now()
global.performance.now = jest.fn(() => Date.now());

// Set up other global mocks as needed
