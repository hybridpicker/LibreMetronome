// src/tests/metronome/MultiCircleBeatMode.test.js
import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import MultiCircleControls from '../../components/metronome/MultiCircleMode/MultiCircleControls';

// Mock the NoteSelector and SubdivisionSelector components
jest.mock('../../components/metronome/Controls/NoteSelector', () => {
  return function MockNoteSelector({ beatMode, onSelect }) {
    return (
      <div data-testid="note-selector">
        <button
          data-testid="quarter-note-button"
          onClick={() => onSelect('quarter')}
        >
          ♩
        </button>
        <button
          data-testid="eighth-note-button"
          onClick={() => onSelect('eighth')}
        >
          ♪
        </button>
      </div>
    );
  };
});

jest.mock('../../components/metronome/Controls/SubdivisionSelector', () => {
  return function MockSubdivisionSelector({ subdivisions, onSelect }) {
    return (
      <div data-testid="subdivision-selector">
        <button onClick={() => onSelect(3)}>3</button>
        <button onClick={() => onSelect(4)}>4</button>
      </div>
    );
  };
});

describe('MultiCircleControls Beat Mode Isolation', () => {
  // Store original functions
  const originalConsoleLog = console.log;
  const originalDispatchEvent = window.dispatchEvent;
  
  // Captured values
  let capturedEvents = [];
  let consoleOutput = [];
  
  beforeEach(() => {
    // Reset captured values
    capturedEvents = [];
    consoleOutput = [];
    
    // Mock console.log
    console.log = jest.fn((...args) => {
      consoleOutput.push(args.join(' '));
      // Still call the original so we see logs in test output
      originalConsoleLog(...args);
    });
    
    // Mock window.dispatchEvent
    window.dispatchEvent = jest.fn(event => {
      capturedEvents.push(event);
      return true;
    });
    
    // Set up window.playingCircleIndex as it would be in the real app
    window.playingCircleIndex = 0;
  });

  afterEach(() => {
    // Restore original implementations
    console.log = originalConsoleLog;
    window.dispatchEvent = originalDispatchEvent;
    delete window.playingCircleIndex;
  });

  test('changing beat mode for playing circle should dispatch event', () => {
    const mockSetCircleSettings = jest.fn(callback => {
      // Mock implementation of setCircleSettings that calls the callback
      const prevSettings = [
        { beatMode: 'quarter', subdivisions: 4, accents: [3, 1, 1, 1] },
        { beatMode: 'quarter', subdivisions: 3, accents: [3, 1, 1] }
      ];
      const updated = callback(prevSettings);
      return updated;
    });
    
    const circleSettings = [
      { beatMode: 'quarter', subdivisions: 4, accents: [3, 1, 1, 1] },
      { beatMode: 'quarter', subdivisions: 3, accents: [3, 1, 1] }
    ];

    render(
      <MultiCircleControls
        circleSettings={circleSettings}
        setCircleSettings={mockSetCircleSettings}
        activeCircle={0}
        playingCircle={0}
        tempo={120}
        setTempo={jest.fn()}
        volume={0.8}
        setVolume={jest.fn()}
        swing={0}
        setSwing={jest.fn()}
      />
    );

    // Find the eighth note button and click it
    const eighthNoteButton = screen.getByTestId('eighth-note-button');
    fireEvent.click(eighthNoteButton);

    // Check if setCircleSettings was called
    expect(mockSetCircleSettings).toHaveBeenCalled();
    
    // Check if the correct event was dispatched
    expect(capturedEvents.length).toBeGreaterThan(0);
    const beatModeEvent = capturedEvents.find(e => e.type === 'beat-mode-change');
    expect(beatModeEvent).toBeTruthy();
    
    // Check event details
    expect(beatModeEvent.detail.beatMode).toBe('eighth');
    expect(beatModeEvent.detail.beatMultiplier).toBe(2);
    expect(beatModeEvent.detail.circleIndex).toBe(0);
    
    // Check console output
    expect(consoleOutput.some(msg => 
      msg.includes('Dispatched beat mode change for playing circle 0')
    )).toBe(true);
  });

  test('changing beat mode for non-playing circle should NOT dispatch beat mode event', () => {
    const mockSetCircleSettings = jest.fn(callback => {
      // Mock implementation of setCircleSettings that calls the callback
      const prevSettings = [
        { beatMode: 'quarter', subdivisions: 4, accents: [3, 1, 1, 1] },
        { beatMode: 'quarter', subdivisions: 3, accents: [3, 1, 1] }
      ];
      const updated = callback(prevSettings);
      return updated;
    });
    
    const circleSettings = [
      { beatMode: 'quarter', subdivisions: 4, accents: [3, 1, 1, 1] },
      { beatMode: 'quarter', subdivisions: 3, accents: [3, 1, 1] }
    ];

    render(
      <MultiCircleControls
        circleSettings={circleSettings}
        setCircleSettings={mockSetCircleSettings}
        activeCircle={1} // Circle 2 is active
        playingCircle={0} // Circle 1 is playing
        tempo={120}
        setTempo={jest.fn()}
        volume={0.8}
        setVolume={jest.fn()}
        swing={0}
        setSwing={jest.fn()}
      />
    );

    // Find the eighth note button and click it
    const eighthNoteButton = screen.getByTestId('eighth-note-button');
    fireEvent.click(eighthNoteButton);

    // Check if setCircleSettings was called
    expect(mockSetCircleSettings).toHaveBeenCalled();
    
    // Check that no beat-mode-change event was dispatched
    const beatModeEvent = capturedEvents.find(e => e.type === 'beat-mode-change');
    expect(beatModeEvent).toBeFalsy();
    
    // Check console output
    expect(consoleOutput.some(msg => 
      msg.includes('Changed beat mode for non-playing circle 1')
    )).toBe(true);
  });

  test('switching playing circle updates which circle dispatches events', () => {
    const mockSetCircleSettings = jest.fn(callback => {
      // Mock implementation of setCircleSettings that calls the callback
      const prevSettings = [
        { beatMode: 'quarter', subdivisions: 4, accents: [3, 1, 1, 1] },
        { beatMode: 'quarter', subdivisions: 3, accents: [3, 1, 1] }
      ];
      const updated = callback(prevSettings);
      return updated;
    });
    
    const circleSettings = [
      { beatMode: 'quarter', subdivisions: 4, accents: [3, 1, 1, 1] },
      { beatMode: 'quarter', subdivisions: 3, accents: [3, 1, 1] }
    ];

    const { rerender } = render(
      <MultiCircleControls
        circleSettings={circleSettings}
        setCircleSettings={mockSetCircleSettings}
        activeCircle={1}
        playingCircle={0}
        tempo={120}
        setTempo={jest.fn()}
        volume={0.8}
        setVolume={jest.fn()}
        swing={0}
        setSwing={jest.fn()}
      />
    );

    // Circle 2 is active but not playing, clicking should NOT dispatch event
    const eighthNoteButton = screen.getByTestId('eighth-note-button');
    fireEvent.click(eighthNoteButton);
    
    // Check no event was dispatched
    let beatModeEvent = capturedEvents.find(e => e.type === 'beat-mode-change');
    expect(beatModeEvent).toBeFalsy();
    
    // Reset captured events
    capturedEvents = [];
    consoleOutput = [];
    
    // Now make Circle 2 both active AND playing
    window.playingCircleIndex = 1;
    rerender(
      <MultiCircleControls
        circleSettings={circleSettings}
        setCircleSettings={mockSetCircleSettings}
        activeCircle={1}
        playingCircle={1}
        tempo={120}
        setTempo={jest.fn()}
        volume={0.8}
        setVolume={jest.fn()}
        swing={0}
        setSwing={jest.fn()}
      />
    );
    
    // Circle 2 is now active AND playing, clicking should dispatch event
    fireEvent.click(eighthNoteButton);
    
    // Check event was dispatched with correct circle index
    beatModeEvent = capturedEvents.find(e => e.type === 'beat-mode-change');
    expect(beatModeEvent).toBeTruthy();
    expect(beatModeEvent.detail.circleIndex).toBe(1);
    
    // Check console output
    expect(consoleOutput.some(msg => 
      msg.includes('Dispatched beat mode change for playing circle 1')
    )).toBe(true);
  });
});