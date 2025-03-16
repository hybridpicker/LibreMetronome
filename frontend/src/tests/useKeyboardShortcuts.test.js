// src/tests/useKeyboardShortcuts.test.js

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
    onToggleInfoOverlay,
    onToggleTrainingOverlay,
    onManualTempoIncrease
  });
  
  return <div data-testid="test-component">Press keyboard shortcuts</div>;
}

describe('useKeyboardShortcuts', () => {
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
    onToggleInfoOverlay: jest.fn(),
    onToggleTrainingOverlay: jest.fn(),
    onManualTempoIncrease: jest.fn(),
  };
  
  // Mock the custom event dispatcher
  const originalDispatchEvent = window.dispatchEvent;
  
  beforeEach(() => {
    // Reset all mocks before each test
    Object.keys(mockFunctions).forEach(key => {
      mockFunctions[key].mockReset();
    });
    
    // Mock dispatchEvent to spy on custom events
    window.dispatchEvent = jest.fn(originalDispatchEvent);
  });
  
  afterEach(() => {
    // Restore original dispatchEvent
    window.dispatchEvent = originalDispatchEvent;
  });
  
  test('Space key triggers onTogglePlayPause', () => {
    render(<TestComponent {...mockFunctions} />);
    const component = screen.getByTestId('test-component');
    
    fireEvent.keyDown(component, { code: 'Space' });
    
    expect(mockFunctions.onTogglePlayPause).toHaveBeenCalledTimes(1);
  });
  
  test('T key triggers onTapTempo when provided', () => {
    // Instead of testing the event dispatch, we'll test that the callback is called
    render(<TestComponent {...mockFunctions} />);
    const component = screen.getByTestId('test-component');
    
    // Press the T key
    fireEvent.keyDown(component, { code: 'KeyT' });
    
    // Check that onTapTempo was called
    expect(mockFunctions.onTapTempo).toHaveBeenCalledTimes(1);
  });
  
  // Test digit keys (1-9) for setting subdivisions
  [1, 2, 3, 4, 5, 6, 7, 8, 9].forEach(num => {
    test(`Digit${num} key sets subdivisions to ${num}`, () => {
      render(<TestComponent {...mockFunctions} />);
      const component = screen.getByTestId('test-component');
      
      fireEvent.keyDown(component, { code: `Digit${num}` });
      
      expect(mockFunctions.onSetSubdivisions).toHaveBeenCalledWith(num);
    });
    
    test(`Numpad${num} key sets subdivisions to ${num}`, () => {
      render(<TestComponent {...mockFunctions} />);
      const component = screen.getByTestId('test-component');
      
      fireEvent.keyDown(component, { code: `Numpad${num}` });
      
      expect(mockFunctions.onSetSubdivisions).toHaveBeenCalledWith(num);
    });
  });
  
  // Test arrow keys
  test('Arrow Up/Right keys increase tempo', () => {
    render(<TestComponent {...mockFunctions} />);
    const component = screen.getByTestId('test-component');
    
    fireEvent.keyDown(component, { code: 'ArrowUp' });
    expect(mockFunctions.onIncreaseTempo).toHaveBeenCalledTimes(1);
    
    mockFunctions.onIncreaseTempo.mockReset();
    
    fireEvent.keyDown(component, { code: 'ArrowRight' });
    expect(mockFunctions.onIncreaseTempo).toHaveBeenCalledTimes(1);
  });
  
  test('Arrow Down/Left keys decrease tempo', () => {
    render(<TestComponent {...mockFunctions} />);
    const component = screen.getByTestId('test-component');
    
    fireEvent.keyDown(component, { code: 'ArrowDown' });
    expect(mockFunctions.onDecreaseTempo).toHaveBeenCalledTimes(1);
    
    mockFunctions.onDecreaseTempo.mockReset();
    
    fireEvent.keyDown(component, { code: 'ArrowLeft' });
    expect(mockFunctions.onDecreaseTempo).toHaveBeenCalledTimes(1);
  });
  
  // Test mode switching keys
  test('P key switches to analog mode', () => {
    render(<TestComponent {...mockFunctions} />);
    const component = screen.getByTestId('test-component');
    
    fireEvent.keyDown(component, { code: 'KeyP' });
    
    expect(mockFunctions.onSwitchToAnalog).toHaveBeenCalledTimes(1);
  });
  
  test('C key switches to circle mode', () => {
    render(<TestComponent {...mockFunctions} />);
    const component = screen.getByTestId('test-component');
    
    fireEvent.keyDown(component, { code: 'KeyC' });
    
    expect(mockFunctions.onSwitchToCircle).toHaveBeenCalledTimes(1);
  });
  
  test('G key switches to grid mode', () => {
    render(<TestComponent {...mockFunctions} />);
    const component = screen.getByTestId('test-component');
    
    fireEvent.keyDown(component, { code: 'KeyG' });
    
    expect(mockFunctions.onSwitchToGrid).toHaveBeenCalledTimes(1);
  });
  
  test('M key switches to multi circle mode', () => {
    render(<TestComponent {...mockFunctions} />);
    const component = screen.getByTestId('test-component');
    
    fireEvent.keyDown(component, { code: 'KeyM' });
    
    expect(mockFunctions.onSwitchToMulti).toHaveBeenCalledTimes(1);
  });
  
  // Test other keys
  test('I key toggles info overlay', () => {
    render(<TestComponent {...mockFunctions} />);
    const component = screen.getByTestId('test-component');
    
    fireEvent.keyDown(component, { code: 'KeyI' });
    
    expect(mockFunctions.onToggleInfoOverlay).toHaveBeenCalledTimes(1);
  });
  
  test('R key toggles training overlay', () => {
    render(<TestComponent {...mockFunctions} />);
    const component = screen.getByTestId('test-component');
    
    fireEvent.keyDown(component, { code: 'KeyR' });
    
    expect(mockFunctions.onToggleTrainingOverlay).toHaveBeenCalledTimes(1);
  });
  
  
  // Test keyboard shortcuts don't trigger in form elements
  test('Keyboard shortcuts are ignored in input elements', () => {
    render(
      <>
        <input data-testid="test-input" />
        <TestComponent {...mockFunctions} />
      </>
    );
    
    const inputElement = screen.getByTestId('test-input');
    
    // Fire space key in the input (should be ignored)
    fireEvent.keyDown(inputElement, { code: 'Space' });
    expect(mockFunctions.onTogglePlayPause).not.toHaveBeenCalled();
    
    // Fire T key in the input (should be ignored)
    fireEvent.keyDown(inputElement, { code: 'KeyT' });
    // The tap tempo shouldn't be triggered for inputs
    expect(mockFunctions.onTapTempo).not.toHaveBeenCalled();
  });
});