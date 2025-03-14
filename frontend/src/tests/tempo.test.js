// src/tests/tempo.test.js
import { createTapTempoLogic } from '../hooks/useMetronomeLogic/tapTempo';
import { manualTempoAcceleration } from '../hooks/useMetronomeLogic/trainingLogic';

describe('Tempo Calculations', () => {
  // Tap Tempo Logic Tests
  describe('Tap Tempo Logic', () => {
    let setTempoMock;
    let tapTempo;
    let performanceNowMock;

    beforeEach(() => {
      // Create a mock function for setting tempo
      setTempoMock = jest.fn();
      
      // Mock performance.now() to simulate precise tap timings
      performanceNowMock = jest.spyOn(performance, 'now');
      
      // Create tap tempo logic with our mock
      tapTempo = createTapTempoLogic({ setTempo: setTempoMock });
    });

    afterEach(() => {
      performanceNowMock.mockRestore();
    });

    test('should calculate correct tempo with precise taps', () => {
      // Simulate taps exactly 500ms apart (120 BPM)
      const baseTime = 1000;
      performanceNowMock
        .mockReturnValueOnce(baseTime)
        .mockReturnValueOnce(baseTime + 500)
        .mockReturnValueOnce(baseTime + 1000)
        .mockReturnValueOnce(baseTime + 1500)
        .mockReturnValueOnce(baseTime + 2000);

      tapTempo(); // First tap
      tapTempo(); // Second tap
      tapTempo(); // Third tap
      tapTempo(); // Fourth tap
      const result = tapTempo(); // Fifth tap

      expect(result).toBe(120);
      expect(setTempoMock).toHaveBeenCalledWith(120);
    });

    test('should clamp tempo between 15 and 240 BPM', () => {
      // Simulate extremely fast taps (well beyond 240 BPM)
      const baseTime = 1000;
      performanceNowMock
        .mockReturnValueOnce(baseTime)
        .mockReturnValueOnce(baseTime + 50)
        .mockReturnValueOnce(baseTime + 100)
        .mockReturnValueOnce(baseTime + 150)
        .mockReturnValueOnce(baseTime + 200)
        .mockReturnValueOnce(baseTime + 250);

      tapTempo(); // First tap
      tapTempo(); // Second tap
      tapTempo(); // Third tap
      tapTempo(); // Fourth tap
      tapTempo(); // Fifth tap
      const result = tapTempo(); // Sixth tap

      expect(result).toBe(240);
      expect(setTempoMock).toHaveBeenCalledWith(240);
    });

    test('should reset tap times if interval is too long', () => {
      const baseTime = 1000;
      performanceNowMock
        .mockReturnValueOnce(baseTime)
        .mockReturnValueOnce(baseTime + 500)
        .mockReturnValueOnce(baseTime + 3000); // More than 2 seconds between taps

      tapTempo(); // First tap
      const result = tapTempo(); // Second tap with long interval

      // Should return null due to long pause and not call setTempo
      expect(result).toBeNull();
      expect(setTempoMock).not.toHaveBeenCalled();
    });

    test('should handle single tap correctly', () => {
      const baseTime = 1000;
      performanceNowMock.mockReturnValue(baseTime);

      const result = tapTempo(); // Single tap

      expect(result).toBeNull();
      expect(setTempoMock).not.toHaveBeenCalled();
    });
  });

  // Manual Tempo Acceleration Tests
  describe('Manual Tempo Acceleration', () => {
    let setTempoMock;

    beforeEach(() => {
      // Create a mock function for setting tempo
      setTempoMock = jest.fn();
    });

    test('should increase tempo by specified percentage', () => {
      const initialTempo = 100;
      const tempoRef = { current: initialTempo };
      const increasePercent = 5;

      const newTempo = manualTempoAcceleration({
        tempoIncreasePercent: increasePercent,
        tempoRef,
        setTempo: setTempoMock
      });

      expect(newTempo).toBe(105);
      expect(setTempoMock).toHaveBeenCalledWith(105);
    });

    test('should not exceed maximum tempo of 240 BPM', () => {
      const initialTempo = 230;
      const tempoRef = { current: initialTempo };
      const increasePercent = 10;

      const newTempo = manualTempoAcceleration({
        tempoIncreasePercent: increasePercent,
        tempoRef,
        setTempo: setTempoMock
      });

      expect(newTempo).toBe(240);
      expect(setTempoMock).toHaveBeenCalledWith(240);
    });

    test('should round tempo to nearest whole number', () => {
      const initialTempo = 97;
      const tempoRef = { current: initialTempo };
      const increasePercent = 5;

      const newTempo = manualTempoAcceleration({
        tempoIncreasePercent: increasePercent,
        tempoRef,
        setTempo: setTempoMock
      });

      expect(newTempo).toBe(102);
      expect(setTempoMock).toHaveBeenCalledWith(102);
    });

    test('should throw error with invalid inputs', () => {
      expect(() => {
        manualTempoAcceleration({
          tempoIncreasePercent: 5,
          tempoRef: null,
          setTempo: () => {}
        });
      }).toThrow('Invalid tempoRef');

      expect(() => {
        manualTempoAcceleration({
          tempoIncreasePercent: 5,
          tempoRef: { current: 100 },
          setTempo: null
        });
      }).toThrow('setTempo must be a function');
    });
  });

  // Metronome Timing Accuracy Tests
  describe('Metronome Timing Accuracy', () => {
    test('should calculate correct beat intervals for different tempos', () => {
      // Test cases for various tempos and beat multipliers
      const testCases = [
        { tempo: 60, beatMultiplier: 1, expectedInterval: 1 },   // Quarter notes at 60 BPM
        { tempo: 120, beatMultiplier: 1, expectedInterval: 0.5 }, // Quarter notes at 120 BPM
        { tempo: 60, beatMultiplier: 2, expectedInterval: 0.5 },  // Eighth notes at 60 BPM
        { tempo: 120, beatMultiplier: 2, expectedInterval: 0.25 } // Eighth notes at 120 BPM
      ];

      testCases.forEach(({ tempo, beatMultiplier, expectedInterval }) => {
        const intervalSec = 60 / (tempo * beatMultiplier);
        expect(intervalSec).toBeCloseTo(expectedInterval, 3);
      });
    });

    test('should apply swing timing correctly', () => {
      // Simulate swing timing calculation
      const basicBeatDuration = 0.5; // 120 BPM quarter notes
      const swingFactor = 0.3;

      const evenSubInterval = basicBeatDuration * (1 + swingFactor);
      const oddSubInterval = basicBeatDuration * (1 - swingFactor);

      expect(evenSubInterval).toBeCloseTo(0.65, 2);
      expect(oddSubInterval).toBeCloseTo(0.35, 2);
    });
  });
});