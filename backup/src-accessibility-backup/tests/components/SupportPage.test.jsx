import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { SupportPage } from '../../components/Support';
import * as supportUtils from '../../utils/supportUtils';

// Mock the supportUtils module
jest.mock('../../utils/supportUtils', () => ({
  getPaymentLink: jest.fn()
}));

describe('SupportPage Component', () => {
  // Mock window.open
  const mockOpen = jest.fn();
  const originalOpen = window.open;
  
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    
    // Set up window.open mock
    window.open = mockOpen;
    
    // Mock successful API response by default
    supportUtils.getPaymentLink.mockResolvedValue('https://test.stripe.com/test-payment-link');
  });
  
  afterEach(() => {
    // Restore original function
    window.open = originalOpen;
  });

  test('renders page structure correctly', async () => {
    await act(async () => {
      render(<SupportPage />);
    });
    
    // Wait for content to load
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Support LibreMetronome/i })).toBeInTheDocument();
    });
    
    // Check that main sections are rendered
    expect(screen.getByText(/always remain completely free/i)).toBeInTheDocument();
    expect(screen.getByText(/Support Goals/i)).toBeInTheDocument();
    expect(screen.getByText(/Future Development/i)).toBeInTheDocument();
    expect(screen.getByText(/Thank you for using LibreMetronome/i)).toBeInTheDocument();
  });

  test('button opens payment link when clicked', async () => {
    await act(async () => {
      render(<SupportPage />);
    });
    
    // Wait for button to load and be enabled
    const button = await waitFor(() => {
      // Look for the support button specifically by class name
      const buttons = screen.getAllByRole('button');
      const supportButton = buttons.find(btn => 
        btn.classList.contains('support-button-large')
      );
      expect(supportButton).not.toBeNull();
      return supportButton;
    });
    
    // Click the support button
    fireEvent.click(button);
    
    // Check that window.open was called with correct URL
    expect(mockOpen).toHaveBeenCalledWith('https://test.stripe.com/test-payment-link', '_blank');
  });

  test('features section displays correctly', async () => {
    await act(async () => {
      render(<SupportPage />);
    });
    
    // Check that feature cards are displayed
    await waitFor(() => {
      expect(screen.getByText(/Premium Sounds/i)).toBeInTheDocument();
      expect(screen.getByText(/Mobile Apps/i)).toBeInTheDocument();
      expect(screen.getByText(/Advanced Training/i)).toBeInTheDocument();
    });
  });
});
