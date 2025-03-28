// src/tests/utils/setupMocks.js

/**
 * Common mock setup for metronome tests
 * This centralizes all the mock setup we need for both App.test.js
 * and the new sound/continuity tests
 */
export const setupAudioMocks = () => {
    // Only mock AudioContext if it's not already mocked
    if (!window.AudioContext || !jest.isMockFunction(window.AudioContext)) {
      window.AudioContext = jest.fn().mockImplementation(() => ({
        createOscillator: jest.fn(),
        createGain: jest.fn(),
        destination: {},
        decodeAudioData: jest.fn().mockResolvedValue({}),
        createBufferSource: jest.fn().mockReturnValue({
          connect: jest.fn(),
          start: jest.fn(),
          stop: jest.fn(),
          buffer: null
        })
      }));
    }
  
    // These mocks are specific to our new tests and won't interfere with existing tests
    try {
      jest.mock('../../hooks/useMetronomeLogic/audioBuffers', () => ({
        initAudioContext: jest.fn(() => {
          if (window.AudioContext) {
            return window.AudioContext();
          }
          return {
            currentTime: 0,
            state: 'running',
            resume: jest.fn().mockResolvedValue(undefined),
            suspend: jest.fn().mockResolvedValue(undefined),
            createBufferSource: jest.fn(() => ({
              connect: jest.fn(),
              start: jest.fn(),
              stop: jest.fn(),
              buffer: null
            })),
            createGain: jest.fn(),
            destination: {}
          };
        }),
        loadClickBuffers: jest.fn().mockResolvedValue({
          normalBuffer: {},
          accentBuffer: {},
          firstBuffer: {}
        }),
      }), { virtual: true });
    } catch (e) {
      console.log('Note: audioBuffers module mock already defined');
    }
  
    // Mock sound service
    try {
      jest.mock('../../services/soundSetService', () => ({
        getActiveSoundSet: jest.fn().mockResolvedValue({
          name: 'Default',
          normal: 'clickNormal.mp3',
          accent: 'clickAccent.mp3',
          first: 'clickFirst.mp3'
        })
      }), { virtual: true });
    } catch (e) {
      console.log('Note: soundSetService mock already defined');
    }
  
    // Mock fetch for loading audio files if not already mocked
    if (!global.fetch || !jest.isMockFunction(global.fetch)) {
      global.fetch = jest.fn(() => 
        Promise.resolve({
          ok: true,
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(100))
        })
      );
    }
  };
  
  /**
   * Setup mocks specifically for performance-critical tests
   */
  export const setupPerformanceMocks = () => {
    // Create a controlled performance.now implementation
    let performanceTime = 0;
    const originalPerformanceNow = performance.now;
    
    performance.now = jest.fn(() => {
      performanceTime += 10;
      return performanceTime;
    });
    
    // Return a function to restore the original implementation
    return () => {
      performance.now = originalPerformanceNow;
    };
  };
  
  /**
   * Custom matchers for metronome tests
   */
  export const setupCustomMatchers = () => {
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
      },
      
      toHaveContinuousPlayback(events, maxGapMs = 300) {
        // Filter for beat events
        const beatEvents = events.filter(ev => ev.type === 'metronome-beat');
        
        // Nothing to test if we don't have at least 2 beats
        if (beatEvents.length < 2) {
          return {
            pass: false,
            message: () => `Not enough beat events to evaluate continuity (found ${beatEvents.length}, need at least 2)`
          };
        }
        
        // Find any excessive gaps between beats
        let largestGap = 0;
        let gapStartIndex = -1;
        
        for (let i = 1; i < beatEvents.length; i++) {
          const gap = beatEvents[i].time - beatEvents[i-1].time;
          if (gap > largestGap) {
            largestGap = gap;
            gapStartIndex = i-1;
          }
        }
        
        const pass = largestGap <= maxGapMs;
        
        return {
          pass,
          message: () => pass
            ? `Expected playback to have gaps larger than ${maxGapMs}ms, but largest gap was ${largestGap}ms`
            : `Expected playback to be continuous, but found a ${largestGap}ms gap between beats at indexes ${gapStartIndex} and ${gapStartIndex+1}`
        };
      }
    });
  };