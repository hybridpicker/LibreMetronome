// Support utilities for accessing the payment link

// Default fallback link for development (will be overridden by API response in production)
const FALLBACK_PAYMENT_LINK = "https://buy.stripe.com/5kAg0J1ARaA6f5u3cc";
let cachedPaymentLink = null;

export const getPaymentLink = async () => {
  if (cachedPaymentLink) {
    return cachedPaymentLink;
  }
  
  try {
    // Add debugging
    console.log('Fetching payment link from API...');
    const response = await fetch('/api/support-info/');
    
    if (!response.ok) {
      console.error(`Error fetching payment link: ${response.status} ${response.statusText}`);
      return '';
    }
    
    const data = await response.json();
    console.log('Received payment link data:', data);
    
    if (data.paymentLink) {
      cachedPaymentLink = data.paymentLink;
      return data.paymentLink;
    }
    // Use fallback if API returns empty string
    console.log('API returned empty payment link, using fallback');
    cachedPaymentLink = FALLBACK_PAYMENT_LINK;
    return FALLBACK_PAYMENT_LINK;
  } catch (error) {
    console.error('Error fetching payment link:', error);
    // Use fallback if API fails completely
    console.log('API request failed, using fallback payment link');
    cachedPaymentLink = FALLBACK_PAYMENT_LINK;
    return FALLBACK_PAYMENT_LINK;
  }
};
