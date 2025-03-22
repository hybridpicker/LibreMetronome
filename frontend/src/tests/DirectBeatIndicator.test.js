// src/tests/DirectBeatIndicator.test.js
import React from 'react';
import { render, screen, act, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DirectBeatIndicator } from '../components/metronome/PolyrhythmMode/DirectBeatIndicator';

// Mock timers for timing-related tests
jest.useFakeTimers();

describe('DirectBeatIndicator', () => {
  const defaultProps = {
    containerSize: 300,
    isPaused: false,
    tempo: 120,
    innerBeats: 4
  };

  beforeEach(() => {
    // Reset mocks between tests
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  test('renders without crashing', () => {
    const { container } = render(<DirectBeatIndicator {...defaultProps} />);
    // Check for SVG element in the container
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  test('starts in non-animating state', () => {
    const { container } = render(<DirectBeatIndicator {...defaultProps} isPaused={true} />);
    const gElement = container.querySelector('g');
    
    // Should have transform: rotate(0deg) when paused
    expect(gElement.style.transform).toBe('rotate(0deg)');
    expect(gElement.style.animation).toBe('none');
  });

  test('starts animation after first beat event', () => {
    const { container, rerender } = render(<DirectBeatIndicator {...defaultProps} />);
    
    // Initially, animation should not be active yet
    expect(container.querySelector('g').style.animation).not.toContain('rotate');
    
    // Simulate first beat event
    act(() => {
      window.dispatchEvent(new Event('polyrhythm-first-beat'));
      // Fast-forward past the initialization delay
      jest.advanceTimersByTime(100);
    });
    
    // Force re-render to see changes
    rerender(<DirectBeatIndicator {...defaultProps} />);
    
    // Now animation should be active
    const style = container.querySelector('g').style;
    expect(style.animation).toContain('rotate');
    expect(style.animation).toContain('2s'); // 60/120*4 = 2 seconds
  });

  test('updates duration when tempo changes', () => {
    const { container, rerender } = render(<DirectBeatIndicator {...defaultProps} />);
    
    // Simulate first beat to start animation
    act(() => {
      window.dispatchEvent(new Event('polyrhythm-first-beat'));
      jest.advanceTimersByTime(100);
    });
    
    // Change tempo and re-render
    rerender(<DirectBeatIndicator {...defaultProps} tempo={60} />);
    
    // Duration should be updated (60/60*4 = 4 seconds)
    const style = container.querySelector('g').style;
    expect(style.animation).toContain('4s');
  });

  test('updates duration when innerBeats changes', () => {
    const { container, rerender } = render(<DirectBeatIndicator {...defaultProps} />);
    
    // Simulate first beat to start animation
    act(() => {
      window.dispatchEvent(new Event('polyrhythm-first-beat'));
      jest.advanceTimersByTime(100);
    });
    
    // Change inner beats and re-render
    rerender(<DirectBeatIndicator {...defaultProps} innerBeats={8} />);
    
    // Duration should be updated (60/120*8 = 4 seconds)
    const style = container.querySelector('g').style;
    expect(style.animation).toContain('4s');
  });

  test('stops animation when paused', () => {
    const { container, rerender } = render(<DirectBeatIndicator {...defaultProps} />);
    
    // Start animation
    act(() => {
      window.dispatchEvent(new Event('polyrhythm-first-beat'));
      jest.advanceTimersByTime(100);
    });
    
    // Pause and re-render
    rerender(<DirectBeatIndicator {...defaultProps} isPaused={true} />);
    
    // Animation should be stopped and reset to 0 degrees
    const style = container.querySelector('g').style;
    expect(style.animation).toBe('none');
    expect(style.transform).toBe('rotate(0deg)');
  });

  test('contains line but no end circle', () => {
    const { container } = render(<DirectBeatIndicator {...defaultProps} />);
    
    // Should have a line
    expect(container.querySelector('line')).toBeInTheDocument();
    
    // Should have only one circle (the center dot)
    const circles = container.querySelectorAll('circle');
    expect(circles.length).toBe(1);
    
    // The circle should be at the center position
    const circle = circles[0];
    expect(circle.getAttribute('cx')).toBe('150'); // centerX
    expect(circle.getAttribute('cy')).toBe('150'); // centerY
  });

  test('syncs with tempo changes correctly', () => {
    const { container, rerender } = render(<DirectBeatIndicator {...defaultProps} />);
    
    // Start animation
    act(() => {
      window.dispatchEvent(new Event('polyrhythm-first-beat'));
      jest.advanceTimersByTime(100);
    });
    
    // Initial animation should be 2s (60/120*4)
    expect(container.querySelector('g').style.animation).toContain('2s');
    
    // Change tempo to 60 bpm
    rerender(<DirectBeatIndicator {...defaultProps} tempo={60} />);
    
    // Duration should double to 4s
    expect(container.querySelector('g').style.animation).toContain('4s');
    
    // Change tempo to 240 bpm
    rerender(<DirectBeatIndicator {...defaultProps} tempo={240} />);
    
    // Duration should be 1s (60/240*4)
    expect(container.querySelector('g').style.animation).toContain('1s');
  });

  test('handles complex polyrhythms correctly', () => {
    const { container, rerender } = render(
      <DirectBeatIndicator {...defaultProps} innerBeats={9} tempo={120} />
    );
    
    // Start animation
    act(() => {
      window.dispatchEvent(new Event('polyrhythm-first-beat'));
      jest.advanceTimersByTime(100);
    });
    
    // Duration for 9 beats at 120bpm should be 4.5s (60/120*9)
    expect(container.querySelector('g').style.animation).toContain('4.5s');
    
    // Simulate multiple first beat events to test periodic resyncs
    for (let i = 0; i < 5; i++) {
      act(() => {
        window.dispatchEvent(new Event('polyrhythm-first-beat'));
      });
    }
    
    // Animation should still be active after multiple beats
    expect(container.querySelector('g').style.animation).toContain('rotate');
  });
});
