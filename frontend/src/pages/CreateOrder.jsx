import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { TEST_MERCHANT } from '../services/api';
import axios from 'axios';

const loadSdk = () => {
  return new Promise((resolve) => {
    if (window.PaymentGateway) { // Already loaded
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'http://localhost:3001/checkout.js';
    script.onload = () => {
      resolve(true);
    };
    script.onerror = () => {
      console.error('Failed to load SDK script');
      resolve(false);
    };
    document.body.appendChild(script);
  });
};

function CreateOrder() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    amount: '',
    currency: 'INR',
    receipt: '',
    notes: ''
  });

  useEffect(() => {
    const email = localStorage.getItem('merchantEmail');
    if (!email) {
      navigate('/login');
    }
    // Preload SDK
    loadSdk();
  }, [navigate]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [orderCreated, setOrderCreated] = useState(null);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const amountInPaise = Math.round(parseFloat(formData.amount) * 100);

      if (amountInPaise < 100) {
        setError('Amount must be at least ₹1.00');
        setLoading(false);
        return;
      }

      const response = await axios.post(
        'http://localhost:8000/api/v1/orders',
        {
          amount: amountInPaise,
          currency: formData.currency,
          receipt: formData.receipt || undefined,
          notes: formData.notes || undefined
        },
        {
          headers: {
            'X-Api-Key': TEST_MERCHANT.apiKey,
            'X-Api-Secret': TEST_MERCHANT.apiSecret,
            'Content-Type': 'application/json'
          }
        }
      );

      setOrderCreated(response.data);

    } catch (err) {
      setError(err.response?.data?.description || 'Failed to create order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('merchantEmail');
    navigate('/login');
  };

  const openSdk = async () => {
    const loaded = await loadSdk();
    if (!loaded) {
      alert('Failed to load Payment SDK. Please try again or check your connection.');
      return;
    }

    const checkout = new window.PaymentGateway({
      key: TEST_MERCHANT.apiKey,
      orderId: orderCreated.id,
      onSuccess: (response) => {
        console.log('Payment Success:', response);
        alert(`Payment Success! Payment ID: ${response.payment_id}`);
        // Optionally redirect to transactions or refresh
        navigate('/dashboard/transactions');
      },
      onFailure: (error) => {
        console.log('Payment Failed:', error);
        const errorMessage = error.message || error.error || error.description || (typeof error === 'string' ? error : JSON.stringify(error));
        alert(`Payment Failed: ${errorMessage}`);
      }
    });
    checkout.open();
  };

  const copyCheckoutLink = () => {
    const checkoutUrl = `http://localhost:3001?order_id=${orderCreated.id}`;
    navigator.clipboard.writeText(checkoutUrl);
    alert('Checkout link copied to clipboard!');
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      {/* Header */}
      <div style={{
        backgroundColor: 'white',
        padding: '20px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        marginBottom: '30px'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <Link
              to="/dashboard"
              style={{
                textDecoration: 'none',
                color: '#007bff',
                fontSize: '18px'
              }}
            >
              ← Back
            </Link>
            <h1 style={{ margin: 0 }}>Create New Order</h1>
          </div>
          <button
            onClick={handleLogout}
            style={{
              padding: '8px 16px',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Logout
          </button>
        </div>
      </div>

      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '0 20px' }}>
        {!orderCreated ? (
          <div style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ marginBottom: '20px' }}>Order Details</h2>

            {error && (
              <div style={{
                padding: '12px',
                backgroundColor: '#fee',
                border: '1px solid #fcc',
                color: '#c33',
                borderRadius: '4px',
                marginBottom: '20px'
              }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Amount (in ₹) *
                </label>
                <input
                  type="number"
                  name="amount"
                  step="0.01"
                  min="1"
                  placeholder="500.00"
                  value={formData.amount}
                  onChange={handleChange}
                  required
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '16px'
                  }}
                />
                <small style={{ color: '#666', fontSize: '12px' }}>
                  Minimum amount: ₹1.00
                </small>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Currency
                </label>
                <select
                  name="currency"
                  value={formData.currency}
                  onChange={handleChange}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '16px'
                  }}
                >
                  <option value="INR">INR - Indian Rupee</option>
                </select>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Receipt (optional)
                </label>
                <input
                  type="text"
                  name="receipt"
                  placeholder="receipt_123"
                  value={formData.receipt}
                  onChange={handleChange}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '16px'
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Notes (optional)
                </label>
                <textarea
                  name="notes"
                  placeholder='{"customer_name": "John Doe"}'
                  value={formData.notes}
                  onChange={handleChange}
                  rows="3"
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '16px',
                    fontFamily: 'monospace'
                  }}
                />
                <small style={{ color: '#666', fontSize: '12px' }}>
                  JSON format for additional information
                </small>
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '12px',
                  backgroundColor: loading ? '#ccc' : '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: loading ? 'not-allowed' : 'pointer'
                }}
              >
                {loading ? 'Creating Order...' : 'Create Order'}
              </button>
            </form>
          </div>
        ) : (
          <div style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <div style={{ textAlign: 'center', marginBottom: '30px' }}>
              <div style={{
                width: '80px',
                height: '80px',
                backgroundColor: '#28a745',
                color: 'white',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '40px',
                margin: '0 auto 20px'
              }}>
                ✓
              </div>
              <h2 style={{ color: '#28a745' }}>Order Created Successfully!</h2>
            </div>

            <div style={{
              backgroundColor: '#f8f9fa',
              padding: '20px',
              borderRadius: '8px',
              marginBottom: '20px'
            }}>
              <div style={{ marginBottom: '15px' }}>
                <strong>Order ID:</strong>
                <div style={{
                  padding: '10px',
                  backgroundColor: 'white',
                  borderRadius: '4px',
                  marginTop: '5px',
                  fontFamily: 'monospace',
                  fontSize: '14px',
                  wordBreak: 'break-all'
                }}>
                  {orderCreated.id}
                </div>
              </div>

              <div style={{ marginBottom: '15px' }}>
                <strong>Amount:</strong>
                <div style={{
                  padding: '10px',
                  backgroundColor: 'white',
                  borderRadius: '4px',
                  marginTop: '5px',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  color: '#007bff'
                }}>
                  ₹{(orderCreated.amount / 100).toFixed(2)}
                </div>
              </div>

              <div style={{ marginBottom: '15px' }}>
                <strong>Status:</strong>
                <div style={{
                  padding: '10px',
                  backgroundColor: 'white',
                  borderRadius: '4px',
                  marginTop: '5px'
                }}>
                  {orderCreated.status}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                onClick={openSdk}
                style={{
                  padding: '12px',
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                Pay Now (with SDK)
              </button>

              <button
                onClick={copyCheckoutLink}
                style={{
                  padding: '12px',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '16px',
                  cursor: 'pointer'
                }}
              >
                Copy Checkout Link
              </button>

              <button
                onClick={() => {
                  setOrderCreated(null);
                  setFormData({
                    amount: '',
                    currency: 'INR',
                    receipt: '',
                    notes: ''
                  });
                }}
                style={{
                  padding: '12px',
                  backgroundColor: 'white',
                  color: '#007bff',
                  border: '2px solid #007bff',
                  borderRadius: '4px',
                  fontSize: '16px',
                  cursor: 'pointer'
                }}
              >
                Create Another Order
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default CreateOrder;