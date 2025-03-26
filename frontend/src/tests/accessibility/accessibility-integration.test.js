// src/tests/accessibility/accessibility-integration.test.js
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../App';
import { loadAccessibilitySettings } from '../../utils/accessibility/accessibilityUtils';
import MainMenu from '../../components/Menu/mainMenu';
import SettingsContent from '../../components/Menu/SettingsContent';

// Mock required components to isolate our testing
jest.mock('../../components/Header/Header', () => () => <div data-testid="header">Header</div>);
jest.mock('../../components/Footer/Footer', () => () => <div data-testid="footer">Footer</div>);
jest.mock('../../components/AdvancedMetronome', () => () => <div data-testid="metronome">Metronome</div>);
jest.mock('../../components/ModeSelector', () => ({ mode, setMode }) => (
  <div data-testid="mode-selector">
    <button onClick={() => setMode('circle')}>Circle</button>
    <button onClick={() => setMode('analog')}>Analog</button>
    <button onClick={() => setMode('grid')}>Grid</button>
  </div>
));

// Mock window.navigator.vibrate for haptic feedback testing
Object.defineProperty(window.navigator, 'vibrate', {
  value: jest.fn(),
  configurable: true
});

// Mock window.matchMedia for system preference testing
const mockMatchMedia = (query) => {
  return {
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // Deprecated but still used in some places
    removeListener: jest.fn(), // Deprecated but still used in some places
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  };
};

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(mockMatchMedia),
});

// Mock the system preference functions in accessibilityUtils directly
jest.mock('../../utils/accessibility/accessibilityUtils', () => {
  const originalModule = jest.requireActual('../../utils/accessibility/accessibilityUtils');
  
  return {
    ...originalModule,
    detectSystemPreferences: jest.fn().mockReturnValue({
      reducedMotion: false,
      highContrast: false,
      darkMode: false
    })
  };
});

// Mock localStorage for testing
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
    getAll: () => store,
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true
});

// Reset mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
  localStorageMock.clear();
  
  // Reset window.audioFeedbackEnabled etc.
  window.audioFeedbackEnabled = false;
  window.screenReaderMessagesEnabled = true;
  window.hapticFeedbackEnabled = false;
  window.focusIndicatorsEnabled = true;
  
  // Reset document.body classes
  document.body.className = '';
});

describe('Accessibility Integration Tests', () => {
  test('Loads default accessibility settings from localStorage on init', async () => {
    // Pre-set some localStorage values
    localStorageMock.setItem('accessibility-high-contrast', 'true');
    localStorageMock.setItem('accessibility-large-text', 'true');
    
    // Render the app
    render(<App />);
    
    // Wait for settings to be applied
    await waitFor(() => {
      expect(document.body.classList.contains('high-contrast')).toBe(true);
      expect(document.body.classList.contains('large-text')).toBe(true);
    });
    
    // Verify localStorage was read the expected number of times
    expect(localStorageMock.getItem).toHaveBeenCalledWith('accessibility-high-contrast');
    expect(localStorageMock.getItem).toHaveBeenCalledWith('accessibility-large-text');
  });
  
  test('Applies high contrast mode when enabled through settings menu', async () => {
    const user = userEvent.setup();
    
    // Render the app
    render(<App />);
    
    // Open the main menu
    const menuButton = screen.getByLabelText('Main Menu');
    await user.click(menuButton);
    
    // Navigate to Settings tab
    const settingsTab = screen.getByText('Settings');
    await user.click(settingsTab);
    
    // Navigate to Accessibility subtab
    const accessibilityTab = screen.getByText('Accessibility');
    await user.click(accessibilityTab);
    
    // Toggle high contrast mode
    const highContrastCheckbox = screen.getByLabelText('High Contrast Mode');
    await user.click(highContrastCheckbox);
    
    // Apply settings
    const applyButton = screen.getByText('Apply Settings');
    await user.click(applyButton);
    
    // Verify the setting was applied
    expect(document.body.classList.contains('high-contrast')).toBe(true);
    expect(localStorageMock.setItem).toHaveBeenCalledWith('accessibility-high-contrast', 'true');
  });
  
  test('Applies large text mode when enabled through settings menu', async () => {
    const user = userEvent.setup();
    
    // Render the app
    render(<App />);
    
    // Open the main menu
    const menuButton = screen.getByLabelText('Main Menu');
    await user.click(menuButton);
    
    // Navigate to Settings tab
    const settingsTab = screen.getByText('Settings');
    await user.click(settingsTab);
    
    // Navigate to Accessibility subtab
    const accessibilityTab = screen.getByText('Accessibility');
    await user.click(accessibilityTab);
    
    // Toggle large text mode
    const largeTextCheckbox = screen.getByLabelText('Large Text');
    await user.click(largeTextCheckbox);
    
    // Apply settings
    const applyButton = screen.getByText('Apply Settings');
    await user.click(applyButton);
    
    // Verify the setting was applied
    expect(document.body.classList.contains('large-text')).toBe(true);
    expect(localStorageMock.setItem).toHaveBeenCalledWith('accessibility-large-text', 'true');
  });
  
  test('Applies reduced motion when enabled through settings menu', async () => {
    const user = userEvent.setup();
    
    // Render the app
    render(<App />);
    
    // Open the main menu
    const menuButton = screen.getByLabelText('Main Menu');
    await user.click(menuButton);
    
    // Navigate to Settings tab
    const settingsTab = screen.getByText('Settings');
    await user.click(settingsTab);
    
    // Navigate to Accessibility subtab
    const accessibilityTab = screen.getByText('Accessibility');
    await user.click(accessibilityTab);
    
    // Toggle reduced motion
    const reducedMotionCheckbox = screen.getByLabelText('Reduced Motion');
    await user.click(reducedMotionCheckbox);
    
    // Apply settings
    const applyButton = screen.getByText('Apply Settings');
    await user.click(applyButton);
    
    // Verify the setting was applied
    expect(document.body.classList.contains('reduced-motion')).toBe(true);
    expect(localStorageMock.setItem).toHaveBeenCalledWith('accessibility-reduced-motion', 'true');
  });
  
  test('Applies audio feedback when enabled through settings menu', async () => {
    const user = userEvent.setup();
    
    // Render the app
    render(<App />);
    
    // Open the main menu
    const menuButton = screen.getByLabelText('Main Menu');
    await user.click(menuButton);
    
    // Navigate to Settings tab
    const settingsTab = screen.getByText('Settings');
    await user.click(settingsTab);
    
    // Navigate to Accessibility subtab
    const accessibilityTab = screen.getByText('Accessibility');
    await user.click(accessibilityTab);
    
    // Toggle audio feedback
    const audioFeedbackCheckbox = screen.getByLabelText('Audio Feedback');
    await user.click(audioFeedbackCheckbox);
    
    // Apply settings
    const applyButton = screen.getByText('Apply Settings');
    await user.click(applyButton);
    
    // Verify the setting was applied
    expect(window.audioFeedbackEnabled).toBe(true);
    expect(localStorageMock.setItem).toHaveBeenCalledWith('accessibility-audio-feedback', 'true');
  });
  
  test('Toggles screen reader messages when changed through settings menu', async () => {
    const user = userEvent.setup();
    
    // Render the app
    render(<App />);
    
    // Open the main menu
    const menuButton = screen.getByLabelText('Main Menu');
    await user.click(menuButton);
    
    // Navigate to Settings tab
    const settingsTab = screen.getByText('Settings');
    await user.click(settingsTab);
    
    // Navigate to Accessibility subtab
    const accessibilityTab = screen.getByText('Accessibility');
    await user.click(accessibilityTab);
    
    // By default, screen reader messages are enabled, so we'll toggle it off
    const screenReaderCheckbox = screen.getByLabelText('Screen Reader Announcements');
    await user.click(screenReaderCheckbox);
    
    // Apply settings
    const applyButton = screen.getByText('Apply Settings');
    await user.click(applyButton);
    
    // Verify the setting was applied
    expect(window.screenReaderMessagesEnabled).toBe(false);
    expect(localStorageMock.setItem).toHaveBeenCalledWith('accessibility-screen-reader-messages', 'false');
  });
  
  test('Settings menu correctly reflects the current state of accessibility settings', async () => {
    const user = userEvent.setup();
    
    // Pre-set some localStorage values
    localStorageMock.setItem('accessibility-high-contrast', 'true');
    localStorageMock.setItem('accessibility-large-text', 'false');
    localStorageMock.setItem('accessibility-reduced-motion', 'true');
    localStorageMock.setItem('accessibility-audio-feedback', 'true');
    
    // Initialize the settings
    loadAccessibilitySettings();
    
    // Render the app
    render(<App />);
    
    // Open the main menu
    const menuButton = screen.getByLabelText('Main Menu');
    await user.click(menuButton);
    
    // Navigate to Settings tab
    const settingsTab = screen.getByText('Settings');
    await user.click(settingsTab);
    
    // Navigate to Accessibility subtab
    const accessibilityTab = screen.getByText('Accessibility');
    await user.click(accessibilityTab);
    
    // Verify checkbox states match our initialized settings
    const highContrastCheckbox = screen.getByLabelText('High Contrast Mode');
    const largeTextCheckbox = screen.getByLabelText('Large Text');
    const reducedMotionCheckbox = screen.getByLabelText('Reduced Motion');
    const audioFeedbackCheckbox = screen.getByLabelText('Audio Feedback');
    
    expect(highContrastCheckbox.checked).toBe(true);
    expect(largeTextCheckbox.checked).toBe(false);
    expect(reducedMotionCheckbox.checked).toBe(true);
    expect(audioFeedbackCheckbox.checked).toBe(true);
  });
  
  test('Accessibility settings are retained when switching between metronome modes', async () => {
    const user = userEvent.setup();
    
    // Pre-set some localStorage values
    localStorageMock.setItem('accessibility-high-contrast', 'true');
    
    // Render the app with pre-loaded settings
    render(<App />);
    
    // Verify high contrast is applied
    expect(document.body.classList.contains('high-contrast')).toBe(true);
    
    // Switch between metronome modes
    const gridModeButton = screen.getByText('Grid');
    await user.click(gridModeButton);
    
    // Ensure high contrast is still applied after mode change
    expect(document.body.classList.contains('high-contrast')).toBe(true);
    
    // Switch to another mode
    const analogModeButton = screen.getByText('Analog');
    await user.click(analogModeButton);
    
    // Ensure high contrast is still applied
    expect(document.body.classList.contains('high-contrast')).toBe(true);
  });
  
  test('System preference changes are respected', async () => {
    // Set up system preference mock to indicate reduced motion
    const originalDetectSystemPreferences = require('../../utils/accessibility/accessibilityUtils').detectSystemPreferences;
    
    // Override the mocked function for this test only
    require('../../utils/accessibility/accessibilityUtils').detectSystemPreferences.mockReturnValue({
      reducedMotion: true,
      highContrast: false,
      darkMode: false
    });
    
    // Render the app
    render(<App />);
    
    // Wait for settings to be applied
    await waitFor(() => {
      expect(document.body.classList.contains('reduced-motion')).toBe(true);
    });
    
    // Verify localStorage was updated accordingly
    expect(localStorageMock.setItem).toHaveBeenCalledWith('accessibility-reduced-motion', 'true');
  });
  
  test('User settings override system preferences', async () => {
    const user = userEvent.setup();
    
    // Set up system preference mock to indicate reduced motion
    require('../../utils/accessibility/accessibilityUtils').detectSystemPreferences.mockReturnValue({
      reducedMotion: true,
      highContrast: false,
      darkMode: false
    });
    
    // User has explicitly disabled reduced motion despite system preference
    localStorageMock.setItem('accessibility-reduced-motion', 'false');
    
    // Render the app
    render(<App />);
    
    // Open the main menu
    const menuButton = screen.getByLabelText('Main Menu');
    await user.click(menuButton);
    
    // Navigate to Settings tab
    const settingsTab = screen.getByText('Settings');
    await user.click(settingsTab);
    
    // Navigate to Accessibility subtab
    const accessibilityTab = screen.getByText('Accessibility');
    await user.click(accessibilityTab);
    
    // Verify checkbox state matches the user preference, not system preference
    const reducedMotionCheckbox = screen.getByLabelText('Reduced Motion');
    expect(reducedMotionCheckbox.checked).toBe(false);
    
    // Verify the body class doesn't have reduced-motion (user preference overrides)
    expect(document.body.classList.contains('reduced-motion')).toBe(false);
  });
  
  test('Haptic feedback is triggered when enabled and supported', async () => {
    const user = userEvent.setup();
    
    // Enable haptic feedback
    localStorageMock.setItem('accessibility-haptic-feedback', 'true');
    window.hapticFeedbackEnabled = true;
    
    // Render the app
    render(<App />);
    
    // Switch metronome mode to trigger haptic feedback
    const gridModeButton = screen.getByText('Grid');
    await user.click(gridModeButton);
    
    // Verify navigator.vibrate was called
    expect(navigator.vibrate).toHaveBeenCalled();
  });
  
  test('Focus indicators setting is applied correctly', async () => {
    const user = userEvent.setup();
    
    // Render the app
    render(<App />);
    
    // Open the main menu
    const menuButton = screen.getByLabelText('Main Menu');
    await user.click(menuButton);
    
    // Navigate to Settings tab
    const settingsTab = screen.getByText('Settings');
    await user.click(settingsTab);
    
    // Navigate to Accessibility subtab
    const accessibilityTab = screen.getByText('Accessibility');
    await user.click(accessibilityTab);
    
    // By default, focus indicators are enabled in our test
    // So we'll toggle it off
    const focusIndicatorsCheckbox = screen.getByLabelText('Enhanced Focus Indicators');
    await user.click(focusIndicatorsCheckbox);
    
    // Apply settings
    const applyButton = screen.getByText('Apply Settings');
    await user.click(applyButton);
    
    // Verify the setting was applied
    expect(document.body.classList.contains('focus-visible-enabled')).toBe(false);
    expect(localStorageMock.setItem).toHaveBeenCalledWith('accessibility-focus-indicators', 'false');
    expect(window.focusIndicatorsEnabled).toBe(false);
  });
  
  test('Color blind mode setting is applied correctly', async () => {
    const user = userEvent.setup();
    
    // Render the app
    render(<App />);
    
    // Open the main menu
    const menuButton = screen.getByLabelText('Main Menu');
    await user.click(menuButton);
    
    // Navigate to Settings tab
    const settingsTab = screen.getByText('Settings');
    await user.click(settingsTab);
    
    // Navigate to Accessibility subtab
    const accessibilityTab = screen.getByText('Accessibility');
    await user.click(accessibilityTab);
    
    // Change color blind mode to protanopia
    const colorBlindSelect = screen.getByLabelText('Color Blind Mode');
    await user.selectOptions(colorBlindSelect, 'protanopia');
    
    // Apply settings
    const applyButton = screen.getByText('Apply Settings');
    await user.click(applyButton);
    
    // Verify the setting was applied
    expect(document.body.classList.contains('color-blind')).toBe(true);
    expect(document.body.classList.contains('protanopia')).toBe(true);
    expect(localStorageMock.setItem).toHaveBeenCalledWith('accessibility-color-blind-mode', 'protanopia');
  });
  
  test('Multiple accessibility settings can be changed at once', async () => {
    const user = userEvent.setup();
    
    // Render the app
    render(<App />);
    
    // Open the main menu
    const menuButton = screen.getByLabelText('Main Menu');
    await user.click(menuButton);
    
    // Navigate to Settings tab
    const settingsTab = screen.getByText('Settings');
    await user.click(settingsTab);
    
    // Navigate to Accessibility subtab
    const accessibilityTab = screen.getByText('Accessibility');
    await user.click(accessibilityTab);
    
    // Change multiple settings
    const highContrastCheckbox = screen.getByLabelText('High Contrast Mode');
    const largeTextCheckbox = screen.getByLabelText('Large Text');
    const audioFeedbackCheckbox = screen.getByLabelText('Audio Feedback');
    
    await user.click(highContrastCheckbox);
    await user.click(largeTextCheckbox);
    await user.click(audioFeedbackCheckbox);
    
    // Apply settings
    const applyButton = screen.getByText('Apply Settings');
    await user.click(applyButton);
    
    // Verify all settings were applied
    expect(document.body.classList.contains('high-contrast')).toBe(true);
    expect(document.body.classList.contains('large-text')).toBe(true);
    expect(window.audioFeedbackEnabled).toBe(true);
    
    expect(localStorageMock.setItem).toHaveBeenCalledWith('accessibility-high-contrast', 'true');
    expect(localStorageMock.setItem).toHaveBeenCalledWith('accessibility-large-text', 'true');
    expect(localStorageMock.setItem).toHaveBeenCalledWith('accessibility-audio-feedback', 'true');
  });
  
  test('Accessibility settings are loaded correctly when changing tabs in SettingsContent', async () => {
    const user = userEvent.setup();
    
    // Pre-set some localStorage values
    localStorageMock.setItem('accessibility-high-contrast', 'true');
    
    // Render the app
    render(<App />);
    
    // Open the main menu
    const menuButton = screen.getByLabelText('Main Menu');
    await user.click(menuButton);
    
    // Navigate to Settings tab
    const settingsTab = screen.getByText('Settings');
    await user.click(settingsTab);
    
    // Navigate to Audio subtab first
    const audioTab = screen.getByText('Audio');
    await user.click(audioTab);
    
    // Then navigate to Accessibility subtab
    const accessibilityTab = screen.getByText('Accessibility');
    await user.click(accessibilityTab);
    
    // Verify the high contrast checkbox is checked
    const highContrastCheckbox = screen.getByLabelText('High Contrast Mode');
    expect(highContrastCheckbox.checked).toBe(true);
  });
});

// Test component methods directly
describe('Accessibility Utility Function Tests', () => {
  test('loadAccessibilitySettings applies correct classes to document.body', () => {
    // Set up localStorage with specific values
    localStorageMock.setItem('accessibility-high-contrast', 'true');
    localStorageMock.setItem('accessibility-large-text', 'true');
    localStorageMock.setItem('accessibility-reduced-motion', 'false');
    localStorageMock.setItem('accessibility-color-blind-mode', 'deuteranopia');
    
    // Call the function directly
    const settings = loadAccessibilitySettings();
    
    // Verify classes were applied
    expect(document.body.classList.contains('high-contrast')).toBe(true);
    expect(document.body.classList.contains('large-text')).toBe(true);
    expect(document.body.classList.contains('reduced-motion')).toBe(false);
    expect(document.body.classList.contains('color-blind')).toBe(true);
    expect(document.body.classList.contains('deuteranopia')).toBe(true);
    
    // Verify settings object is correct
    expect(settings.highContrast).toBe(true);
    expect(settings.largeText).toBe(true);
    expect(settings.reducedMotion).toBe(false);
    expect(settings.colorBlindMode).toBe('deuteranopia');
  });
  
  test('loadAccessibilitySettings sets global window variables', () => {
    // Set up localStorage with specific values
    localStorageMock.setItem('accessibility-audio-feedback', 'true');
    localStorageMock.setItem('accessibility-screen-reader-messages', 'false');
    localStorageMock.setItem('accessibility-haptic-feedback', 'true');
    localStorageMock.setItem('accessibility-focus-indicators', 'false');
    
    // Call the function directly
    loadAccessibilitySettings();
    
    // Verify window globals were set
    expect(window.audioFeedbackEnabled).toBe(true);
    expect(window.screenReaderMessagesEnabled).toBe(false);
    expect(window.hapticFeedbackEnabled).toBe(true);
    expect(window.focusIndicatorsEnabled).toBe(false);
  });
});
