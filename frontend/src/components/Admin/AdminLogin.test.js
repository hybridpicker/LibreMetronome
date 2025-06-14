import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import AdminLogin from './AdminLogin';

// Mock fetch
global.fetch = jest.fn();

describe('AdminLogin Component', () => {
  beforeEach(() => {
    fetch.mockClear();
    localStorage.clear();
  });

  test('renders login form', () => {
    render(<AdminLogin onLogin={jest.fn()} />);
    
    expect(screen.getByText('Admin Login')).toBeInTheDocument();
    expect(screen.getByLabelText('Username')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Login' })).toBeInTheDocument();
  });

  test('handles successful login', async () => {
    const mockOnLogin = jest.fn();
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        token: 'test-token',
        username: 'admin'
      })
    });

    render(<AdminLogin onLogin={mockOnLogin} />);
    
    fireEvent.change(screen.getByLabelText('Username'), {
      target: { value: 'admin' }
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'password' }
    });
    
    fireEvent.click(screen.getByRole('button', { name: 'Login' }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/admin/login/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'admin', password: 'password' }),
        credentials: 'include'
      });
      expect(mockOnLogin).toHaveBeenCalledWith({
        token: 'test-token',
        username: 'admin'
      });
      expect(localStorage.getItem('adminToken')).toBe('test-token');
    });
  });

  test('handles login error', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({
        error: 'Invalid credentials'
      })
    });

    render(<AdminLogin onLogin={jest.fn()} />);
    
    fireEvent.change(screen.getByLabelText('Username'), {
      target: { value: 'admin' }
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'wrong' }
    });
    
    fireEvent.click(screen.getByRole('button', { name: 'Login' }));

    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
    });
  });

  test('handles network error', async () => {
    fetch.mockRejectedValueOnce(new Error('Network error'));

    render(<AdminLogin onLogin={jest.fn()} />);
    
    fireEvent.change(screen.getByLabelText('Username'), {
      target: { value: 'admin' }
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'password' }
    });
    
    fireEvent.click(screen.getByRole('button', { name: 'Login' }));

    await waitFor(() => {
      expect(screen.getByText('Network error. Please try again.')).toBeInTheDocument();
    });
  });

  test('disables button while loading', async () => {
    fetch.mockImplementation(() => new Promise(() => {})); // Never resolves

    render(<AdminLogin onLogin={jest.fn()} />);
    
    const button = screen.getByRole('button', { name: 'Login' });
    
    fireEvent.change(screen.getByLabelText('Username'), {
      target: { value: 'admin' }
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'password' }
    });
    
    fireEvent.click(button);

    await waitFor(() => {
      expect(button).toBeDisabled();
      expect(button).toHaveTextContent('Logging in...');
    });
  });
});
