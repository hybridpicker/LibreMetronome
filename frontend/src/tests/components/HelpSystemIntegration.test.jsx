import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { HelpButton, InfoModal } from '../../components/InfoSection';

// This is a simple wrapper component that simulates the behavior of these components
// in the actual application
const HelpSystem = () => {
  const [modalOpen, setModalOpen] = React.useState(false);
  
  const handleOpenModal = () => {
    setModalOpen(true);
  };
  
  const handleCloseModal = () => {
    setModalOpen(false);
  };

  // Add effect for 'I' key press
  React.useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.code === 'KeyI') {
        handleOpenModal();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);
  
  return (
    <>
      <HelpButton onClick={handleOpenModal} />
      <InfoModal isOpen={modalOpen} onClose={handleCloseModal} />
    </>
  );
};

describe('Help System Integration', () => {
  test('clicking the help button opens the modal', () => {
    render(<HelpSystem />);
    
    // Initially, the modal should not be visible
    expect(screen.queryByText('Metronome Guide')).not.toBeInTheDocument();
    
    // Find and click the help button
    const helpButton = screen.getByRole('button', { name: /help & guide/i });
    fireEvent.click(helpButton);
    
    // Now the modal should be visible
    expect(screen.getByText('Metronome Guide')).toBeInTheDocument();
  });
  
  test('clicking the close button in the modal closes it', () => {
    render(<HelpSystem />);
    
    // Open the modal first
    const helpButton = screen.getByRole('button', { name: /help & guide/i });
    fireEvent.click(helpButton);
    
    // Modal should be visible
    expect(screen.getByText('Metronome Guide')).toBeInTheDocument();
    
    // Find and click the close button
    const closeButton = screen.getByRole('button', { name: /close guide/i });
    fireEvent.click(closeButton);
    
    // Modal should no longer be visible
    expect(screen.queryByText('Metronome Guide')).not.toBeInTheDocument();
  });
  
  test('pressing I opens the modal and ESC closes it', () => {
    render(<HelpSystem />);
    
    // Initially, the modal should not be visible
    expect(screen.queryByText('Metronome Guide')).not.toBeInTheDocument();
    
    // Simulate pressing the I key
    fireEvent.keyDown(document, { key: 'i', code: 'KeyI' });
    
    // Modal should now be visible
    expect(screen.getByText('Metronome Guide')).toBeInTheDocument();
    
    // Simulate pressing the ESC key
    fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });
    
    // Modal should no longer be visible
    expect(screen.queryByText('Metronome Guide')).not.toBeInTheDocument();
  });
  
  test('pressing ESC closes the modal when opened with button', () => {
    render(<HelpSystem />);
    
    // Open the modal first
    const helpButton = screen.getByRole('button', { name: /help & guide/i });
    fireEvent.click(helpButton);
    
    // Modal should be visible
    expect(screen.getByText('Metronome Guide')).toBeInTheDocument();
    
    // Simulate pressing the ESC key
    fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });
    
    // Modal should no longer be visible
    expect(screen.queryByText('Metronome Guide')).not.toBeInTheDocument();
  });
  
  test('the full workflow: open modal, change tabs, close modal', () => {
    render(<HelpSystem />);
    
    // Open the modal
    const helpButton = screen.getByRole('button', { name: /help & guide/i });
    fireEvent.click(helpButton);
    
    // Check initial tab content
    expect(screen.getByText('What is a Metronome?')).toBeInTheDocument();
    
    // Switch to How to Use tab
    fireEvent.click(screen.getByRole('button', { name: /how to use/i }));
    expect(screen.getByText('How to Use LibreMetronome')).toBeInTheDocument();
    
    // Switch to Features tab
    fireEvent.click(screen.getByRole('button', { name: /features/i }));
    expect(screen.getByText('Key Metronome Features')).toBeInTheDocument();
    
    // Switch to Shortcuts tab
    fireEvent.click(screen.getByRole('button', { name: /shortcuts/i }));
    expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument();
    
    // Close the modal
    const closeButton = screen.getByRole('button', { name: /close guide/i });
    fireEvent.click(closeButton);
    
    // Modal should no longer be visible
    expect(screen.queryByText('Metronome Guide')).not.toBeInTheDocument();
  });

  test('clicking outside the modal closes it', () => {
    const { container } = render(<HelpSystem />);
    
    // Open the modal
    const helpButton = screen.getByRole('button', { name: /help & guide/i });
    fireEvent.click(helpButton);
    
    // Modal should be visible
    expect(screen.getByText('Metronome Guide')).toBeInTheDocument();
    
    // Get the overlay and click outside the modal content
    const overlay = container.querySelector('.info-modal-overlay');
    fireEvent.mouseDown(overlay);
    
    // Modal should no longer be visible
    expect(screen.queryByText('Metronome Guide')).not.toBeInTheDocument();
  });
});
