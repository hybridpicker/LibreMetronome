// Store original global.fetch
const originalFetch = global.fetch;

// We'll import the module inside each test to get a fresh cache
describe('supportUtils', () => {
  beforeEach(() => {
    // Clear module cache before each test
    jest.resetModules();
    
    // Create a mock for fetch
    global.fetch = jest.fn(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ paymentLink: 'https://test.stripe.com/test-payment-link' })
    }));
    
    // Clear mocks
    jest.clearAllMocks();
    
    // Silence console logs during tests
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  
  afterEach(() => {
    // Restore original fetch
    global.fetch = originalFetch;
    
    // Restore console
    console.log.mockRestore();
    console.error.mockRestore();
  });

  test('getPaymentLink function exists', () => {
    // Import the function fresh
    const { getPaymentLink } = require('../../utils/supportUtils');
    expect(typeof getPaymentLink).toBe('function');
  });

  test('getPaymentLink returns a promise', () => {
    // Import the function fresh
    const { getPaymentLink } = require('../../utils/supportUtils');
    const result = getPaymentLink();
    expect(result instanceof Promise).toBe(true);
  });

  test('getPaymentLink calls fetch', async () => {
    // Make a fresh mock for this test and clear any cached results
    jest.resetModules();
    
    // Import the function again to get a fresh instance
    const { getPaymentLink } = require('../../utils/supportUtils');
    
    // Setup fetch mock
    global.fetch = jest.fn(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ paymentLink: 'https://test.stripe.com/test-payment-link' })
    }));
    
    await getPaymentLink();
    expect(global.fetch).toHaveBeenCalled();
  });
  
  test('getPaymentLink returns data from API when successful', async () => {
    // Reset modules to clear cache
    jest.resetModules();
    
    // Import the function again to get a fresh instance
    const { getPaymentLink } = require('../../utils/supportUtils');
    
    // Mock successful API response
    global.fetch = jest.fn(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ paymentLink: 'https://test.stripe.com/test-payment-link' })
    }));
    
    const result = await getPaymentLink();
    
    // Verify the API data is returned
    expect(result).toBe('https://test.stripe.com/test-payment-link');
    expect(global.fetch).toHaveBeenCalledWith('/api/support-info/');
  });

  test('getPaymentLink handles errors and returns fallback', async () => {
    // Reset modules to clear cache
    jest.resetModules();
    
    // Import the function again to get a fresh instance
    const { getPaymentLink } = require('../../utils/supportUtils');
    
    // Mock fetch to throw an error
    global.fetch = jest.fn(() => Promise.reject(new Error('Network error')));
    
    const result = await getPaymentLink();
    
    // Check that the fallback value is returned
    expect(result).toBe('https://buy.stripe.com/5kAg0J1ARaA6f5u3cc');
  });
});
