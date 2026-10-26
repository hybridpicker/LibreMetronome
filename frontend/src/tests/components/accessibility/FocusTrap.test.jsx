import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import FocusTrap from '../../../components/accessibility/FocusTrap';
import { playAudioFeedback, announceToScreenReader } from '../../../utils/accessibility/accessibilityUtils';

jest.mock('../../../utils/accessibility/accessibilityUtils', () => ({
  playAudioFeedback: jest.fn(),
  announceToScreenReader: jest.fn()
}));

const Harness = ({ isActive = true, onEscape, triggerRef }) => (
  <FocusTrap isActive={isActive} onEscape={onEscape} triggerRef={triggerRef}>
    <button>first</button>
    <input aria-label="middle" />
    <button disabled>disabled</button>
    <button aria-hidden="true">hidden</button>
    <button>last</button>
  </FocusTrap>
);

describe('FocusTrap', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    window.audioFeedbackEnabled = false;
    window.screenReaderMessagesEnabled = false;
  });

  afterEach(() => {
    jest.useRealTimers();
    delete window.audioFeedbackEnabled;
    delete window.screenReaderMessagesEnabled;
  });

  test('renders its children inside a focus-trap wrapper', () => {
    render(<Harness />);
    // eslint-disable-next-line testing-library/no-node-access
    expect(screen.getByRole('button', { name: 'first' }).parentElement).toHaveClass('focus-trap');
  });

  test('focuses the first focusable element when activated', () => {
    render(<Harness />);
    expect(screen.getByRole('button', { name: 'first' })).toHaveFocus();
  });

  test('does nothing while inactive', () => {
    const onEscape = jest.fn();
    render(<Harness isActive={false} onEscape={onEscape} />);
    expect(screen.getByRole('button', { name: 'first' })).not.toHaveFocus();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onEscape).not.toHaveBeenCalled();
  });

  test('Tab on the last element wraps to the first, skipping disabled and aria-hidden ones', () => {
    render(<Harness />);
    screen.getByRole('button', { name: 'last' }).focus();
    const notPrevented = fireEvent.keyDown(document, { key: 'Tab' });
    expect(notPrevented).toBe(false);
    expect(screen.getByRole('button', { name: 'first' })).toHaveFocus();
  });

  test('Shift+Tab on the first element wraps to the last', () => {
    render(<Harness />);
    const notPrevented = fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(notPrevented).toBe(false);
    expect(screen.getByRole('button', { name: 'last' })).toHaveFocus();
  });

  test('Tab in the middle of the trap is left to the browser', () => {
    render(<Harness />);
    screen.getByRole('textbox', { name: 'middle' }).focus();
    expect(fireEvent.keyDown(document, { key: 'Tab' })).toBe(true);
    expect(fireEvent.keyDown(document, { key: 'Tab', shiftKey: true })).toBe(true);
    expect(screen.getByRole('textbox', { name: 'middle' })).toHaveFocus();
  });

  test('Escape calls onEscape and prevents the default action', () => {
    const onEscape = jest.fn();
    render(<Harness onEscape={onEscape} />);
    expect(fireEvent.keyDown(document, { key: 'Escape' })).toBe(false);
    expect(onEscape).toHaveBeenCalledTimes(1);
  });

  test('Escape without onEscape handler is ignored', () => {
    render(<Harness />);
    expect(fireEvent.keyDown(document, { key: 'Escape' })).toBe(true);
  });

  test('other keys are ignored', () => {
    const onEscape = jest.fn();
    render(<Harness onEscape={onEscape} />);
    expect(fireEvent.keyDown(document, { key: 'a' })).toBe(true);
    expect(onEscape).not.toHaveBeenCalled();
  });

  test('restores focus to the trigger element after deactivation (asynchronously)', () => {
    const trigger = document.createElement('button');
    document.body.appendChild(trigger);
    const triggerRef = { current: trigger };
    const { rerender } = render(<Harness triggerRef={triggerRef} />);
    expect(screen.getByRole('button', { name: 'first' })).toHaveFocus();

    rerender(<Harness triggerRef={triggerRef} isActive={false} />);
    expect(trigger).not.toHaveFocus();
    act(() => { jest.runAllTimers(); });
    expect(trigger).toHaveFocus();
    trigger.remove();
  });

  test('restores focus to the previously focused element when no triggerRef is given', () => {
    const opener = document.createElement('button');
    document.body.appendChild(opener);
    opener.focus();
    const { unmount } = render(<Harness />);
    expect(opener).not.toHaveFocus();
    unmount();
    act(() => { jest.runAllTimers(); });
    expect(opener).toHaveFocus();
    opener.remove();
  });

  test('removes the key listener on deactivation', () => {
    const onEscape = jest.fn();
    const { rerender } = render(<Harness onEscape={onEscape} />);
    rerender(<Harness onEscape={onEscape} isActive={false} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onEscape).not.toHaveBeenCalled();
  });

  test('plays audio feedback and announces when the user enabled them', () => {
    window.audioFeedbackEnabled = true;
    window.screenReaderMessagesEnabled = true;
    const { unmount } = render(<Harness />);
    expect(announceToScreenReader).toHaveBeenCalledWith('Dialog opened. Press Escape to close.', 'polite');
    expect(playAudioFeedback).toHaveBeenCalledWith('click');
    jest.clearAllMocks();
    unmount();
    act(() => { jest.runAllTimers(); });
    expect(playAudioFeedback).toHaveBeenCalledWith('click');
    expect(announceToScreenReader).toHaveBeenCalledWith('Dialog closed.', 'polite');
  });

  test('stays silent when audio feedback and screen-reader messages are off', () => {
    const { unmount } = render(<Harness />);
    unmount();
    act(() => { jest.runAllTimers(); });
    expect(playAudioFeedback).not.toHaveBeenCalled();
    expect(announceToScreenReader).not.toHaveBeenCalled();
  });

  test('without focusable children no listener is installed', () => {
    const onEscape = jest.fn();
    render(<FocusTrap isActive onEscape={onEscape}><p>text only</p></FocusTrap>);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onEscape).not.toHaveBeenCalled();
  });
});
