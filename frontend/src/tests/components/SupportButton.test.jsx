import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { SupportButton } from '../../components/Support';
import * as supportUtils from '../../utils/supportUtils';

// Mock the supportUtils module
jest.mock('../../utils/supportUtils', () => ({
  getPaymentLink: jest.fn()
}));

describe('SupportButton Component', () => {
  // Mock window.open
  const mockOpen = jest.fn();
  const originalOpen = window.open;
  
  // Mock window.setShowSupportPage
  const mockSetShowSupportPage = jest.fn();
  const originalSetShowSupportPage = window.setShowSupportPage;
  
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    
    // Set up window.open mock
    window.open = mockOpen;
    
    // Set up window.setShowSupportPage mock
    window.setShowSupportPage = mockSetShowSupportPage;
    
    // Mock successful API response by default
    supportUtils.getPaymentLink.mockResolvedValue('https://test.stripe.com/test-payment-link');
  });
  
  afterEach(() => {
    // Restore original functions
    window.open = originalOpen;
    window.setShowSupportPage = originalSetShowSupportPage;
  });

  test('renders correctly with loading state and then support text', async () => {
    await act(async () => {
      render(<SupportButton />);
    });
    
    // Wait for the component to update after API call
    await waitFor(() => {
      expect(screen.getByText(/Donate/i)).toBeInTheDocument();
    });
  });

  test('opens payment link in new tab when clicked', async () => {
    await act(async () => {
      render(<SupportButton />);
    });
    
    await waitFor(() => {
      expect(screen.getByText(/Donate/i)).toBeInTheDocument();
    });
    
    // Click the button
    fireEvent.click(screen.getByRole('button'));
    
    // Check that window.open was called with the correct URL
    expect(mockOpen).toHaveBeenCalledWith('https://test.stripe.com/test-payment-link', '_blank');
  });

  test('navigates to internal page when useInternalPage is true', async () => {
    await act(async () => {
      render(<SupportButton useInternalPage={true} />);
    });
    
    await waitFor(() => {
      expect(screen.getByText(/Donate/i)).toBeInTheDocument();
    });
    
    // Click the button
    fireEvent.click(screen.getByRole('button'));
    
    // Check that window.setShowSupportPage was called
    expect(mockSetShowSupportPage).toHaveBeenCalledWith(true);
    
    // Check that window.open was not called
    expect(mockOpen).not.toHaveBeenCalled();
  });
});
