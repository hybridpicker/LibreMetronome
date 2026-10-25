import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import AccessibilitySettings from '../../../components/accessibility/AccessibilitySettings';
import { playAudioFeedback, announceToScreenReader } from '../../../utils/accessibility/accessibilityUtils';

jest.mock('../../../utils/accessibility/accessibilityUtils', () => ({
  playAudioFeedback: jest.fn(),
  announceToScreenReader: jest.fn()
}));

const BODY_CLASSES = ['high-contrast', 'large-text', 'reduced-motion', 'color-blind',
  'protanopia', 'deuteranopia', 'tritanopia', 'monochromacy', 'focus-visible-enabled'];
const KEYS = ['high-contrast', 'large-text', 'reduced-motion', 'audio-feedback',
  'screen-reader-messages', 'focus-indicators', 'haptic-feedback', 'color-blind-mode'];

let prefersReducedMotion;

describe('AccessibilitySettings', () => {
  let logSpy;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    localStorage.clear();
    document.body.classList.remove(...BODY_CLASSES);
    prefersReducedMotion = false;
    window.matchMedia = jest.fn(() => ({ matches: prefersReducedMotion }));
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
    jest.useRealTimers();
    ['audioFeedbackEnabled', 'screenReaderMessagesEnabled', 'focusIndicatorsEnabled', 'hapticFeedbackEnabled']
      .forEach((k) => delete window[k]);
    delete window.navigator.vibrate;
  });

  const mountSettings = (props = {}) => {
    const onClose = jest.fn();
    render(<AccessibilitySettings onClose={onClose} {...props} />);
    return onClose;
  };

  test('exposes an accessible modal dialog with its title', () => {
    mountSettings();
    const dialog = screen.getByRole('dialog', { name: 'Accessibility Settings' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });

  test('defaults: focus indicators on, everything else off, colour-blind mode none', () => {
    mountSettings();
    expect(screen.getByLabelText('High Contrast Mode')).not.toBeChecked();
    expect(screen.getByLabelText('Large Text')).not.toBeChecked();
    expect(screen.getByLabelText('Reduced Motion')).not.toBeChecked();
    expect(screen.getByLabelText('Audio Feedback')).not.toBeChecked();
    expect(screen.getByLabelText('Enhanced Focus Indicators')).toBeChecked();
    expect(screen.getByLabelText('Color Blind Mode')).toHaveValue('none');
  });

  test('persists defaults to localStorage and window flags on mount', () => {
    mountSettings();
    expect(localStorage.getItem('accessibility-high-contrast')).toBe('false');
    expect(localStorage.getItem('accessibility-focus-indicators')).toBe('true');
    expect(localStorage.getItem('accessibility-screen-reader-messages')).toBe('true');
    expect(localStorage.getItem('accessibility-haptic-feedback')).toBe('false');
    expect(localStorage.getItem('accessibility-color-blind-mode')).toBe('none');
    expect(window.screenReaderMessagesEnabled).toBe(true);
    expect(window.focusIndicatorsEnabled).toBe(true);
    expect(window.hapticFeedbackEnabled).toBe(false);
    expect(window.audioFeedbackEnabled).toBe(false);
    expect(document.body).toHaveClass('focus-visible-enabled');
  });

  test('restores persisted values', () => {
    localStorage.setItem('accessibility-high-contrast', 'true');
    localStorage.setItem('accessibility-large-text', 'true');
    localStorage.setItem('accessibility-audio-feedback', 'true');
    localStorage.setItem('accessibility-focus-indicators', 'false');
    localStorage.setItem('accessibility-color-blind-mode', 'protanopia');
    mountSettings();
    expect(screen.getByLabelText('High Contrast Mode')).toBeChecked();
    expect(screen.getByLabelText('Large Text')).toBeChecked();
    expect(screen.getByLabelText('Audio Feedback')).toBeChecked();
    expect(screen.getByLabelText('Enhanced Focus Indicators')).not.toBeChecked();
    expect(screen.getByLabelText('Color Blind Mode')).toHaveValue('protanopia');
    expect(document.body).toHaveClass('high-contrast', 'large-text', 'color-blind', 'protanopia');
    expect(document.body).not.toHaveClass('focus-visible-enabled');
    expect(window.audioFeedbackEnabled).toBe(true);
  });

  test('reduced motion defaults to on when the OS prefers reduced motion', () => {
    prefersReducedMotion = true;
    mountSettings();
    expect(screen.getByLabelText('Reduced Motion')).toBeChecked();
    expect(document.body).toHaveClass('reduced-motion');
    expect(localStorage.getItem('accessibility-reduced-motion')).toBe('true');
  });

  test.each([
    ['High Contrast Mode', 'high-contrast', 'high-contrast'],
    ['Large Text', 'large-text', 'large-text'],
    ['Reduced Motion', 'reduced-motion', 'reduced-motion']
  ])('toggling %s persists the value and toggles the body class', (label, key, bodyClass) => {
    mountSettings();
    fireEvent.click(screen.getByLabelText(label));
    expect(screen.getByLabelText(label)).toBeChecked();
    expect(localStorage.getItem(`accessibility-${key}`)).toBe('true');
    expect(document.body).toHaveClass(bodyClass);

    fireEvent.click(screen.getByLabelText(label));
    expect(localStorage.getItem(`accessibility-${key}`)).toBe('false');
    expect(document.body).not.toHaveClass(bodyClass);
  });

  test('toggling focus indicators removes and re-adds the body class', () => {
    mountSettings();
    fireEvent.click(screen.getByLabelText('Enhanced Focus Indicators'));
    expect(document.body).not.toHaveClass('focus-visible-enabled');
    expect(localStorage.getItem('accessibility-focus-indicators')).toBe('false');
    expect(window.focusIndicatorsEnabled).toBe(false);
    fireEvent.click(screen.getByLabelText('Enhanced Focus Indicators'));
    expect(document.body).toHaveClass('focus-visible-enabled');
  });

  test('large text triggers a delayed resize event so the layout can adapt', () => {
    mountSettings();
    const onResize = jest.fn();
    window.addEventListener('resize', onResize);
    fireEvent.click(screen.getByLabelText('Large Text'));
    expect(onResize).not.toHaveBeenCalled();
    act(() => { jest.advanceTimersByTime(49); });
    expect(onResize).not.toHaveBeenCalled();
    act(() => { jest.advanceTimersByTime(1); });
    expect(onResize).toHaveBeenCalledTimes(1);
    window.removeEventListener('resize', onResize);
  });

  test('large text announces the change to screen readers when enabled', () => {
    mountSettings();
    fireEvent.click(screen.getByLabelText('Large Text'));
    expect(announceToScreenReader).toHaveBeenCalledWith('Large text mode enabled', 'polite');
    fireEvent.click(screen.getByLabelText('Large Text'));
    expect(announceToScreenReader).toHaveBeenCalledWith('Large text mode disabled', 'polite');
  });

  test.each([
    ['protanopia'], ['deuteranopia'], ['tritanopia'], ['monochromacy']
  ])('colour-blind mode %s adds the generic and the specific class and replaces the previous one', (mode) => {
    mountSettings();
    const select = screen.getByLabelText('Color Blind Mode');
    fireEvent.change(select, { target: { value: 'protanopia' } });
    fireEvent.change(select, { target: { value: mode } });
    expect(document.body).toHaveClass('color-blind', mode);
    expect(document.body.classList.contains('protanopia')).toBe(mode === 'protanopia');
    expect(localStorage.getItem('accessibility-color-blind-mode')).toBe(mode);
  });

  test('colour-blind mode none clears all classes', () => {
    mountSettings();
    const select = screen.getByLabelText('Color Blind Mode');
    fireEvent.change(select, { target: { value: 'tritanopia' } });
    fireEvent.change(select, { target: { value: 'none' } });
    expect(document.body).not.toHaveClass('color-blind');
    expect(document.body).not.toHaveClass('tritanopia');
  });

  test('every change is broadcast as an accessibility-settings-changed event', () => {
    mountSettings();
    const handler = jest.fn();
    window.addEventListener('accessibility-settings-changed', handler);
    fireEvent.click(screen.getByLabelText('High Contrast Mode'));
    window.removeEventListener('accessibility-settings-changed', handler);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail).toEqual({ setting: 'highContrast', value: true });
  });

  test('turning audio feedback on plays a click, turning it off does not', () => {
    mountSettings();
    fireEvent.click(screen.getByLabelText('Audio Feedback'));
    expect(window.audioFeedbackEnabled).toBe(true);
    expect(localStorage.getItem('accessibility-audio-feedback')).toBe('true');
    expect(playAudioFeedback).toHaveBeenCalledTimes(1);
    playAudioFeedback.mockClear();
    fireEvent.click(screen.getByLabelText('Audio Feedback'));
    expect(window.audioFeedbackEnabled).toBe(false);
    expect(playAudioFeedback).not.toHaveBeenCalled();
  });

  test('other toggles play a click only while audio feedback is enabled', () => {
    mountSettings();
    fireEvent.click(screen.getByLabelText('High Contrast Mode'));
    expect(playAudioFeedback).not.toHaveBeenCalled();

    fireEvent.click(screen.getByLabelText('Audio Feedback'));
    playAudioFeedback.mockClear();
    fireEvent.click(screen.getByLabelText('High Contrast Mode'));
    fireEvent.click(screen.getByLabelText('Large Text'));
    fireEvent.click(screen.getByLabelText('Reduced Motion'));
    fireEvent.click(screen.getByLabelText('Enhanced Focus Indicators'));
    fireEvent.change(screen.getByLabelText('Color Blind Mode'), { target: { value: 'tritanopia' } });
    expect(playAudioFeedback).toHaveBeenCalledTimes(5);
  });

  test('Save & Close announces, calls onClose, and does not vibrate by default', () => {
    window.navigator.vibrate = jest.fn();
    const onClose = mountSettings();
    fireEvent.click(screen.getByRole('button', { name: 'Save accessibility settings and close dialog' }));
    expect(announceToScreenReader).toHaveBeenCalledWith('Accessibility settings saved and dialog closed', 'polite');
    expect(window.navigator.vibrate).not.toHaveBeenCalled();
    expect(playAudioFeedback).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('Save & Close vibrates when haptic feedback was persisted as enabled', () => {
    localStorage.setItem('accessibility-haptic-feedback', 'true');
    window.navigator.vibrate = jest.fn();
    mountSettings();
    fireEvent.click(screen.getByRole('button', { name: /save accessibility settings/i }));
    expect(window.navigator.vibrate).toHaveBeenCalledWith(100);
  });

  test('Save & Close with haptics enabled but no vibrate API does not throw', () => {
    localStorage.setItem('accessibility-haptic-feedback', 'true');
    delete window.navigator.vibrate;
    const onClose = mountSettings();
    fireEvent.click(screen.getByRole('button', { name: /save accessibility settings/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('Save & Close plays a click when audio feedback is on and stays silent for screen readers when they are off', () => {
    localStorage.setItem('accessibility-audio-feedback', 'true');
    localStorage.setItem('accessibility-screen-reader-messages', 'false');
    mountSettings();
    playAudioFeedback.mockClear();
    announceToScreenReader.mockClear();
    fireEvent.click(screen.getByRole('button', { name: /save accessibility settings/i }));
    expect(playAudioFeedback).toHaveBeenCalledWith('click');
    expect(announceToScreenReader).not.toHaveBeenCalled();
  });

  test('close button and Escape both call onClose', () => {
    const onClose = mountSettings();
    fireEvent.click(screen.getByRole('button', { name: 'Close accessibility settings' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  test('lists the keyboard shortcuts', () => {
    mountSettings();
    expect(screen.getByRole('heading', { name: 'Keyboard Shortcuts' })).toBeInTheDocument();
    expect(screen.getByText(/Play\/Pause metronome/)).toBeInTheDocument();
  });

  test('uses all eight storage keys', () => {
    mountSettings();
    KEYS.forEach((k) => expect(localStorage.getItem(`accessibility-${k}`)).not.toBeNull());
  });
});
