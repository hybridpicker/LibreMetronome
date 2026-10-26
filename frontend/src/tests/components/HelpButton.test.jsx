import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { HelpButton } from '../../components/InfoSection';

describe('HelpButton Component', () => {
  const mockOnClick = jest.fn();

  beforeEach(() => {
    // Reset mock function before each test
    jest.clearAllMocks();
  });

  test('renders correctly with a question mark', () => {
    render(<HelpButton onClick={mockOnClick} />);
    
    // Check that the button is in the document
    const button = screen.getByRole('button', { name: /help & guide/i });
    expect(button).toBeInTheDocument();
    
    // Check that it contains a question mark (?)
    expect(button.textContent).toBe('?');
  });

  test('has correct accessibility attributes', () => {
    render(<HelpButton onClick={mockOnClick} />);
    
    // Check for proper accessibility attributes
    const button = screen.getByRole('button', { name: /help & guide/i });
    expect(button).toHaveAttribute('aria-label', 'Help & Guide');
    expect(button).toHaveAttribute('title', 'Metronome Guide - Press G');
  });

  test('calls onClick handler when clicked', () => {
    render(<HelpButton onClick={mockOnClick} />);
    
    // Find and click the button
    const button = screen.getByRole('button', { name: /help & guide/i });
    fireEvent.click(button);
    
    // Check that onClick was called
    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });

  test('has the correct CSS class', () => {
    render(<HelpButton onClick={mockOnClick} />);
    
    // Check for the correct CSS class
    const button = screen.getByRole('button', { name: /help & guide/i });
    expect(button).toHaveClass('help-button');
  });
});
