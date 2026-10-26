import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SupportButton, SupportPage } from '../../../components/Support';
import { InfoModal } from '../../../components/InfoSection';
import { getPaymentLink } from '../../../utils/supportUtils';

let mockNative = false;
jest.mock('../../../nativeApp', () => ({
  get IS_NATIVE_APP() { return mockNative; }
}));
jest.mock('../../../utils/supportUtils', () => ({
  getPaymentLink: jest.fn()
}));

describe('Support components, failure and edge paths', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNative = false;
    jest.spyOn(console, 'error').mockImplementation(() => {});
    window.open = jest.fn();
    delete window.setShowSupportPage;
  });

  afterEach(() => {
    jest.restoreAllMocks();
    delete window.setShowSupportPage;
  });

  test('SupportButton stays disabled and logs when the payment link cannot be fetched', async () => {
    getPaymentLink.mockRejectedValue(new Error('offline'));
    render(<SupportButton />);
    await waitFor(() => expect(console.error).toHaveBeenCalledWith(
      'Failed to get payment link in component:', expect.any(Error)));
    expect(screen.getByRole('button', { name: 'Support this project' })).toBeDisabled();
  });

  test('SupportButton is disabled while loading, even with an internal page', async () => {
    let resolve;
    getPaymentLink.mockReturnValue(new Promise((r) => { resolve = r; }));
    render(<SupportButton useInternalPage />);
    expect(screen.getByRole('button', { name: 'Support this project' })).toBeDisabled();
    resolve('https://pay.example');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Support this project' })).toBeEnabled());
  });

  test('SupportButton with internal page opens it instead of the payment link', async () => {
    getPaymentLink.mockResolvedValue('https://pay.example');
    window.setShowSupportPage = jest.fn();
    render(<SupportButton useInternalPage />);
    const button = screen.getByRole('button', { name: 'Support this project' });
    await waitFor(() => expect(button).toBeEnabled());
    fireEvent.click(button);
    expect(window.setShowSupportPage).toHaveBeenCalledWith(true);
    expect(window.open).not.toHaveBeenCalled();
  });

  test('SupportButton with internal page but no page opener falls back to the payment link', async () => {
    getPaymentLink.mockResolvedValue('https://pay.example');
    render(<SupportButton useInternalPage />);
    const button = screen.getByRole('button', { name: 'Support this project' });
    await waitFor(() => expect(button).toBeEnabled());
    fireEvent.click(button);
    expect(window.open).toHaveBeenCalledWith('https://pay.example', '_blank');
  });

  test('SupportButton with internal page and failed link click does nothing', async () => {
    getPaymentLink.mockRejectedValue(new Error('offline'));
    render(<SupportButton useInternalPage />);
    const button = screen.getByRole('button', { name: 'Support this project' });
    await waitFor(() => expect(button).toBeEnabled());
    fireEvent.click(button);
    expect(window.open).not.toHaveBeenCalled();
  });

  test('SupportPage keeps the donate button disabled when fetching fails', async () => {
    getPaymentLink.mockRejectedValue(new Error('offline'));
    render(<SupportPage />);
    await waitFor(() => expect(console.error).toHaveBeenCalled());
    const button = screen.getByRole('button', { name: /Support/ });
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(window.open).not.toHaveBeenCalled();
  });

  test('SupportPage shows "Loading" until the link arrived', async () => {
    let resolve;
    getPaymentLink.mockReturnValue(new Promise((r) => { resolve = r; }));
    render(<SupportPage />);
    expect(screen.getByText('Loading')).toBeInTheDocument();
    resolve('https://pay.example');
    await waitFor(() => expect(screen.queryByText('Loading')).not.toBeInTheDocument());
    expect(screen.getByRole('button', { name: /Support/ })).toBeEnabled();
  });

  test('SupportPage click without a link does not open a window', async () => {
    getPaymentLink.mockResolvedValue('');
    render(<SupportPage />);
    await waitFor(() => expect(screen.queryByText('Loading')).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /Support/ }));
    expect(window.open).not.toHaveBeenCalled();
  });

  describe('InfoModal', () => {
    test('web build: donate wrapper closes the guide when clicked', async () => {
      getPaymentLink.mockResolvedValue('https://pay.example');
      const onClose = jest.fn();
      render(<InfoModal isOpen onClose={onClose} />);
      fireEvent.click(screen.getByRole('button', { name: 'Support this project' }));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    test('web build lists the D shortcut and the online wording', () => {
      getPaymentLink.mockResolvedValue('x');
      render(<InfoModal isOpen onClose={jest.fn()} />);
      expect(screen.getByText('Free Online Metronome')).toBeInTheDocument();
      expect(screen.getByText(/Show Support menu/)).toBeInTheDocument();
    });

    test('native build: offline wording, no donate button, no D shortcut', () => {
      mockNative = true;
      render(<InfoModal isOpen onClose={jest.fn()} />);
      expect(screen.getByText('Precision Practice Metronome')).toBeInTheDocument();
      expect(screen.getByText('Why LibreMetronome')).toBeInTheDocument();
      expect(screen.getByText('Works fully offline, with no account and no tracking')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Support this project' })).not.toBeInTheDocument();
      expect(screen.queryByText(/Show Support menu/)).not.toBeInTheDocument();
      expect(getPaymentLink).not.toHaveBeenCalled();
    });

    test('Escape and outside clicks are ignored while the modal is closed', () => {
      const onClose = jest.fn();
      render(<InfoModal isOpen={false} onClose={onClose} />);
      fireEvent.keyDown(document, { key: 'Escape' });
      fireEvent.mouseDown(document.body);
      expect(onClose).not.toHaveBeenCalled();
    });

    test('other keys do not close the modal', () => {
      const onClose = jest.fn();
      getPaymentLink.mockResolvedValue('x');
      render(<InfoModal isOpen onClose={onClose} />);
      fireEvent.keyDown(document, { key: 'Enter' });
      expect(onClose).not.toHaveBeenCalled();
    });

    test('the About tab can be re-selected after visiting another tab', () => {
      getPaymentLink.mockResolvedValue('x');
      render(<InfoModal isOpen onClose={jest.fn()} />);
      fireEvent.click(screen.getByRole('tab', { name: /features/i }));
      expect(screen.getByRole('tab', { name: /about/i })).toHaveAttribute('aria-selected', 'false');
      fireEvent.click(screen.getByRole('tab', { name: /about/i }));
      expect(screen.getByRole('tab', { name: /about/i })).toHaveAttribute('aria-selected', 'true');
    });

    test('shows the package version', () => {
      getPaymentLink.mockResolvedValue('x');
      render(<InfoModal isOpen onClose={jest.fn()} />);
      fireEvent.click(screen.getByRole('tab', { name: /shortcuts/i }));
      expect(screen.getByText(/LibreMetronome Version \d+\.\d+\.\d+/)).toBeInTheDocument();
    });
  });
});
