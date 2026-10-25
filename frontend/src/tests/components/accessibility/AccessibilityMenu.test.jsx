import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import AccessibilityMenu from '../../../components/accessibility/AccessibilityMenu';
import { playAudioFeedback } from '../../../utils/accessibility/accessibilityUtils';

jest.mock('../../../utils/accessibility/accessibilityUtils', () => ({
  playAudioFeedback: jest.fn(),
  announceToScreenReader: jest.fn()
}));

const BODY_CLASSES = ['high-contrast', 'large-text', 'reduced-motion', 'color-blind',
  'protanopia', 'deuteranopia', 'tritanopia', 'monochromacy', 'focus-visible-enabled'];

describe('AccessibilityMenu', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    document.body.classList.remove(...BODY_CLASSES);
    window.audioFeedbackEnabled = false;
    window.matchMedia = jest.fn(() => ({ matches: false }));
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    delete window.audioFeedbackEnabled;
    jest.restoreAllMocks();
  });

  test('renders only the container while closed', () => {
    render(<AccessibilityMenu />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  test('renders the settings dialog while open', () => {
    render(<AccessibilityMenu isOpen onClose={jest.fn()} />);
    expect(screen.getByRole('dialog', { name: 'Accessibility Settings' })).toBeInTheDocument();
  });

  test('applies persisted settings to the body on mount, even while closed', () => {
    localStorage.setItem('accessibility-high-contrast', 'true');
    localStorage.setItem('accessibility-large-text', 'true');
    localStorage.setItem('accessibility-reduced-motion', 'true');
    localStorage.setItem('accessibility-color-blind-mode', 'tritanopia');
    render(<AccessibilityMenu />);
    expect(document.body).toHaveClass('high-contrast', 'large-text', 'reduced-motion', 'color-blind', 'tritanopia');
  });

  test('removes stale body classes when nothing is persisted', () => {
    document.body.classList.add('high-contrast', 'large-text', 'reduced-motion', 'color-blind', 'protanopia');
    render(<AccessibilityMenu />);
    BODY_CLASSES.slice(0, 8).forEach((c) => expect(document.body).not.toHaveClass(c));
  });

  test('Escape closes the open menu once and plays feedback when enabled', () => {
    // the settings dialog overwrites window.audioFeedbackEnabled from localStorage on mount
    localStorage.setItem('accessibility-audio-feedback', 'true');
    const onClose = jest.fn();
    render(<AccessibilityMenu isOpen onClose={onClose} />);
    playAudioFeedback.mockClear();
    fireEvent.keyDown(document, { key: 'Escape' });
    // characterization: current behaviour, see report - the menu's own listener and the
    // FocusTrap inside the dialog both handle Escape, so onClose fires twice
    expect(onClose).toHaveBeenCalledTimes(2);
    expect(playAudioFeedback).toHaveBeenCalledWith('click');
  });

  test('Escape stays silent when audio feedback is off', () => {
    render(<AccessibilityMenu isOpen onClose={jest.fn()} />);
    playAudioFeedback.mockClear();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(playAudioFeedback).not.toHaveBeenCalled();
  });

  test('Escape does nothing while the menu is closed', () => {
    const onClose = jest.fn();
    render(<AccessibilityMenu isOpen={false} onClose={onClose} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
  });

  test('Escape without an onClose handler does not throw', () => {
    render(<AccessibilityMenu isOpen />);
    expect(() => fireEvent.keyDown(document, { key: 'Escape' })).not.toThrow();
  });

  test('other keys do not close the menu', () => {
    const onClose = jest.fn();
    render(<AccessibilityMenu isOpen onClose={onClose} />);
    fireEvent.keyDown(document, { key: 'x' });
    expect(onClose).not.toHaveBeenCalled();
  });

  test('the close button of the dialog calls onClose', () => {
    const onClose = jest.fn();
    render(<AccessibilityMenu isOpen onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'Close accessibility settings' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('closing from the dialog without onClose handler does not throw', () => {
    render(<AccessibilityMenu isOpen />);
    expect(() => fireEvent.click(screen.getByRole('button', { name: 'Close accessibility settings' }))).not.toThrow();
  });
});
