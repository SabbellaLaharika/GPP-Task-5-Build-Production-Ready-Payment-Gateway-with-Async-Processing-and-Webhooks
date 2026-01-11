import axios from 'axios';

const API_BASE_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:8000'  // Development
  : '';  // Production (nginx proxy)

// Test merchant credentials
export const TEST_MERCHANT = {
  email: 'test@example.com',
  apiKey: 'key_test_abc123',
  apiSecret: 'secret_test_xyz789'
};

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Get all payments for merchant
export const getPayments = async () => {
  try {
    const response = await api.get('/api/v1/payments', {
      headers: {
        'X-Api-Key': TEST_MERCHANT.apiKey,
        'X-Api-Secret': TEST_MERCHANT.apiSecret
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching payments:', error);
    throw error;
  }
};

// Get single payment
export const getPayment = async (paymentId) => {
  try {
    const response = await api.get(`/api/v1/payments/${paymentId}`, {
      headers: {
        'X-Api-Key': TEST_MERCHANT.apiKey,
        'X-Api-Secret': TEST_MERCHANT.apiSecret
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching payment:', error);
    throw error;
  }
};

export default api;