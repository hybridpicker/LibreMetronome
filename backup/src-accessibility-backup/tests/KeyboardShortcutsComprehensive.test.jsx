import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import useKeyboardShortcuts from '../hooks/useKeyboardShortcuts';

// Mock component that uses the keyboard shortcuts hook
function TestComponent({
  onTogglePlayPause,
  onTapTempo,
  onSetSubdivisions,
  onIncreaseTempo,
  onDecreaseTempo,
  onSwitchToAnalog,
  onSwitchToCircle,
  onSwitchToGrid,
  onSwitchToMulti,
  onSwitchToPolyrhythm,
  onToggleInfoOverlay,
  onToggleTrainingOverlay,
  onManualTempoIncrease
}) {
  useKeyboardShortcuts({
    onTogglePlayPause,
    onTapTempo,
    onSetSubdivisions,
    onIncreaseTempo,
    onDecreaseTempo,
    onSwitchToAnalog,
    onSwitchToCircle,
    onSwitchToGrid,
    onSwitchToMulti,
    onSwitchToPolyrhythm,
    onToggleInfoOverlay,
    onToggleTrainingOverlay,
    onManualTempoIncrease
  });
  
  return <div data-testid="test-component">Press keyboard shortcuts</div>;
}

describe('Comprehensive Keyboard Shortcuts Test', () => {
  // Mock functions for each callback
  const mockFunctions = {
    onTogglePlayPause: jest.fn(),
    onTapTempo: jest.fn(),
    onSetSubdivisions: jest.fn(),
    onIncreaseTempo: jest.fn(),
    onDecreaseTempo: jest.fn(),
    onSwitchToAnalog: jest.fn(),
    onSwitchToCircle: jest.fn(),
    onSwitchToGrid: jest.fn(),
    onSwitchToMulti: jest.fn(),
    onSwitchToPolyrhythm: jest.fn(),
    onToggleInfoOverlay: jest.fn(),
    onToggleTrainingOverlay: jest.fn(),
    onManualTempoIncrease: jest.fn(),
  };
  
  // Store a mapping of keys to their expected functions for easy testing
  const keyMappings = [
    { key: 'Space', code: 'Space', func: 'onTogglePlayPause', description: 'toggles play/pause' },
    { key: 'T', code: 'KeyT', func: 'onTapTempo', description: 'triggers tap tempo' },
    { key: '1', code: 'Digit1', func: 'onSetSubdivisions', args: [1], description: 'sets subdivisions to 1' },
    { key: '2', code: 'Digit2', func: 'onSetSubdivisions', args: [2], description: 'sets subdivisions to 2' },
    { key: '3', code: 'Digit3', func: 'onSetSubdivisions', args: [3], description: 'sets subdivisions to 3' },
    { key: '4', code: 'Digit4', func: 'onSetSubdivisions', args: [4], description: 'sets subdivisions to 4' },
    { key: '5', code: 'Digit5', func: 'onSetSubdivisions', args: [5], description: 'sets subdivisions to 5' },
    { key: '6', code: 'Digit6', func: 'onSetSubdivisions', args: [6], description: 'sets subdivisions to 6' },
    { key: '7', code: 'Digit7', func: 'onSetSubdivisions', args: [7], description: 'sets subdivisions to 7' },
    { key: '8', code: 'Digit8', func: 'onSetSubdivisions', args: [8], description: 'sets subdivisions to 8' },
    { key: '9', code: 'Digit9', func: 'onSetSubdivisions', args: [9], description: 'sets subdivisions to 9' },
    { key: 'ArrowUp', code: 'ArrowUp', func: 'onIncreaseTempo', description: 'increases tempo' },
    { key: 'ArrowRight', code: 'ArrowRight', func: 'onIncreaseTempo', description: 'increases tempo' },
    { key: 'ArrowDown', code: 'ArrowDown', func: 'onDecreaseTempo', description: 'decreases tempo' },
    { key: 'ArrowLeft', code: 'ArrowLeft', func: 'onDecreaseTempo', description: 'decreases tempo' },
    { key: 'A', code: 'KeyA', func: 'onSwitchToAnalog', description: 'switches to analog/pendulum mode' },
    { key: 'C', code: 'KeyC', func: 'onSwitchToCircle', description: 'switches to circle mode' },
    { key: 'G', code: 'KeyG', func: 'onSwitchToGrid', description: 'switches to grid mode' },
    { key: 'M', code: 'KeyM', func: 'onSwitchToMulti', description: 'switches to multi circle mode' },
    { key: 'Y', code: 'KeyY', func: 'onSwitchToPolyrhythm', description: 'switches to polyrhythm mode' },
    { key: 'I', code: 'KeyI', func: 'onToggleInfoOverlay', description: 'toggles info overlay' },
    { key: 'R', code: 'KeyR', func: 'onToggleTrainingOverlay', description: 'toggles training overlay' },
    { key: 'Enter', code: 'Enter', func: 'onManualTempoIncrease', description: 'triggers manual tempo increase' },
  ];
  
  beforeEach(() => {
    // Reset all mocks before each test
    Object.keys(mockFunctions).forEach(key => {
      mockFunctions[key].mockReset();
    });
  });
  
  // Test each key mapping from the array
  keyMappings.forEach(mapping => {
    test(`${mapping.key} key ${mapping.description}`, () => {
      render(<TestComponent {...mockFunctions} />);
      const component = screen.getByTestId('test-component');
      
      fireEvent.keyDown(component, { code: mapping.code });
      
      if (mapping.args) {
        expect(mockFunctions[mapping.func]).toHaveBeenCalledWith(...mapping.args);
      } else {
        expect(mockFunctions[mapping.func]).toHaveBeenCalledTimes(1);
      }
    });
  });
  
  // Test numpad keys (1-9) separately
  [1, 2, 3, 4, 5, 6, 7, 8, 9].forEach(num => {
    test(`Numpad${num} key sets subdivisions to ${num}`, () => {
      render(<TestComponent {...mockFunctions} />);
      const component = screen.getByTestId('test-component');
      
      fireEvent.keyDown(component, { code: `Numpad${num}` });
      
      expect(mockFunctions.onSetSubdivisions).toHaveBeenCalledWith(num);
    });
  });
  
  // Test that keyboard shortcuts are correctly ignored in form elements
  test('Keyboard shortcuts are ignored in form elements', () => {
    render(
      <>
        <input data-testid="test-input" />
        <TestComponent {...mockFunctions} />
      </>
    );
    
    const inputElement = screen.getByTestId('test-input');
    
    // Try some common shortcuts in an input element
    fireEvent.keyDown(inputElement, { code: 'Space' });
    fireEvent.keyDown(inputElement, { code: 'KeyT' });
    fireEvent.keyDown(inputElement, { code: 'KeyA' });
    fireEvent.keyDown(inputElement, { code: 'KeyI' });
    
    // Check that no callbacks were triggered
    expect(mockFunctions.onTogglePlayPause).not.toHaveBeenCalled();
    expect(mockFunctions.onTapTempo).not.toHaveBeenCalled();
    expect(mockFunctions.onSwitchToAnalog).not.toHaveBeenCalled();
    expect(mockFunctions.onToggleInfoOverlay).not.toHaveBeenCalled();
  });
});
