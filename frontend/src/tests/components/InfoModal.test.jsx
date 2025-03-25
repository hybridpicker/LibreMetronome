import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { InfoModal } from '../../components/InfoSection';

describe('InfoModal Component', () => {
  const mockOnClose = jest.fn();
  
  beforeEach(() => {
    // Reset mock before each test
    jest.clearAllMocks();
  });

  test('does not render when isOpen is false', () => {
    render(<InfoModal isOpen={false} onClose={mockOnClose} />);
    
    // The modal should not be in the document
    expect(screen.queryByText('Metronome Guide')).not.toBeInTheDocument();
  });

  test('renders when isOpen is true', () => {
    render(<InfoModal isOpen={true} onClose={mockOnClose} />);
    
    // The modal should be in the document
    expect(screen.getByText('Metronome Guide')).toBeInTheDocument();
    
    // Default tab (About) should be active
    expect(screen.getByText('Free Online Metronome')).toBeInTheDocument();
  });

  test('close button calls onClose function', () => {
    render(<InfoModal isOpen={true} onClose={mockOnClose} />);
    
    // Find and click the close button
    const closeButton = screen.getByRole('button', { name: /close guide/i });
    fireEvent.click(closeButton);
    
    // Check that onClose was called
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  test('tab switching works correctly', () => {
    render(<InfoModal isOpen={true} onClose={mockOnClose} />);
    
    // Initial "About" tab should be active
    expect(screen.getByText('Free Online Metronome')).toBeInTheDocument();
    
    // Click the "How to Use" tab
    fireEvent.click(screen.getByRole('button', { name: /how to use/i }));
    
    // "How to Use" content should now be visible
    expect(screen.getByText('How to Use LibreMetronome')).toBeInTheDocument();
    
    // Click the "Features" tab
    fireEvent.click(screen.getByRole('button', { name: /features/i }));
    
    // "Features" content should now be visible
    expect(screen.getByText('Key Metronome Features')).toBeInTheDocument();
    
    // Click the "Shortcuts" tab
    fireEvent.click(screen.getByRole('button', { name: /shortcuts/i }));
    
    // "Shortcuts" content should now be visible
    expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument();
  });

  test('ESC key calls onClose function', () => {
    render(<InfoModal isOpen={true} onClose={mockOnClose} />);
    
    // Simulate pressing the ESC key
    fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });
    
    // Check that onClose was called
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  test('clicking outside the modal calls onClose function', () => {
    // Use container to access the backdrop element
    const { container } = render(<InfoModal isOpen={true} onClose={mockOnClose} />);
    
    // Find the overlay element (parent of the modal)
    const overlay = container.querySelector('.info-modal-overlay');
    
    // Click on the overlay outside the modal content
    fireEvent.mouseDown(overlay);
    
    // Check that onClose was called
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  test('clicking inside the modal does not call onClose', () => {
    render(<InfoModal isOpen={true} onClose={mockOnClose} />);
    
    // Find and click on an element inside the modal content
    const modalContent = screen.getByText('Free Online Metronome');
    fireEvent.mouseDown(modalContent);
    
    // onClose should not have been called
    expect(mockOnClose).not.toHaveBeenCalled();
  });
  
  test('renders all tab content correctly', () => {
    render(<InfoModal isOpen={true} onClose={mockOnClose} />);
    
    // Check "About" tab
    expect(screen.getByText('What is a Metronome?')).toBeInTheDocument();
    expect(screen.getByText('Online Metronome Benefits')).toBeInTheDocument();
    
    // Switch to "How to Use" tab and check content
    fireEvent.click(screen.getByRole('button', { name: /how to use/i }));
    expect(screen.getByText('Select a Mode')).toBeInTheDocument();
    expect(screen.getByText('Set Your Tempo')).toBeInTheDocument();
    expect(screen.getByText('Customize Settings')).toBeInTheDocument();
    expect(screen.getByText('Start Practicing')).toBeInTheDocument();
    
    // Switch to "Features" tab and check content
    fireEvent.click(screen.getByRole('button', { name: /features/i }));
    expect(screen.getByText('Tap Tempo')).toBeInTheDocument();
    expect(screen.getByText('Time Signatures')).toBeInTheDocument();
    expect(screen.getByText('Visual Modes')).toBeInTheDocument();
    
    // Switch to "Shortcuts" tab and check content
    fireEvent.click(screen.getByRole('button', { name: /shortcuts/i }));
    expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument();
    expect(screen.getByText('Beat Types')).toBeInTheDocument();
  });
});
