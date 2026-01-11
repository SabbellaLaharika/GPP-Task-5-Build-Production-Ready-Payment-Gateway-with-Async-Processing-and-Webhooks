import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { TEST_MERCHANT } from '../services/api';
import axios from 'axios';

function Transactions() {
  const navigate = useNavigate();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const email = localStorage.getItem('merchantEmail');
    if (!email) {
      navigate('/login');
      return;
    }

    fetchPayments();
  }, [navigate]);
  // Auto-refresh every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchPayments();
    }, 10000); // Refresh every 10 seconds

    return () => clearInterval(interval);
  }, []);
  const fetchPayments = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch all payments
      // Note: Since we don't have a list endpoint yet, this will fail gracefully
      // In a real implementation, you'd have GET /api/v1/payments endpoint
      const response = await axios.get('http://localhost:8000/api/v1/payments', {
        headers: {
          'X-Api-Key': TEST_MERCHANT.apiKey,
          'X-Api-Secret': TEST_MERCHANT.apiSecret
        }
      });
      
      setPayments(response.data || []);
    } catch (error) {
      console.error('Error fetching payments:', error);
      setError('Unable to fetch payments. Make sure you have created some payments first.');
      setPayments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('merchantEmail');
    navigate('/login');
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const formatAmount = (amount) => {
    if (!amount) return '₹0.00';
    return `₹${(amount / 100).toFixed(2)}`;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'success':
        return '#28a745';
      case 'failed':
        return '#dc3545';
      case 'processing':
        return '#ffc107';
      default:
        return '#6c757d';
    }
  };

  const printReceipt = (payment) => {
    const receiptWindow = window.open('', '_blank');
    if (!receiptWindow)  alert("Popup blocked! Please allow popups.");
    receiptWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Transaction Receipt - ${payment.id}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            max-width: 600px;
            margin: 40px auto;
            padding: 20px;
          }
          .receipt-header {
            text-align: center;
            border-bottom: 2px solid #333;
            padding-bottom: 20px;
            margin-bottom: 20px;
          }
          .receipt-header h1 {
            margin: 0;
            color: #333;
          }
          .receipt-row {
            display: flex;
            justify-content: space-between;
            padding: 10px 0;
            border-bottom: 1px solid #eee;
          }
          .receipt-row.total {
            font-weight: bold;
            font-size: 18px;
            border-bottom: 2px solid #333;
            margin-top: 10px;
          }
          .receipt-label {
            color: #666;
          }
          .receipt-value {
            font-weight: bold;
            color: #333;
          }
          .status-success {
            color: #28a745;
            font-weight: bold;
            font-size: 16px;
          }
          .status-failed {
            color: #dc3545;
            font-weight: bold;
            font-size: 16px;
          }
          .status-processing {
            color: #ffc107;
            font-weight: bold;
            font-size: 16px;
          }
          .receipt-footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 2px solid #333;
            color: #666;
            font-size: 12px;
          }
          @media print {
            body {
              margin: 0;
            }
            button {
              display: none;
            }
          }
        </style>
      </head>
      <body>
        <div class="receipt-header">
          <h1>Transaction Receipt</h1>
          <p>Payment Gateway Dashboard</p>
        </div>
        
        <div class="receipt-row">
          <span class="receipt-label">Payment ID:</span>
          <span class="receipt-value">${payment.id}</span>
        </div>
        
        <div class="receipt-row">
          <span class="receipt-label">Order ID:</span>
          <span class="receipt-value">${payment.order_id}</span>
        </div>
        
        <div class="receipt-row">
          <span class="receipt-label">Date & Time:</span>
          <span class="receipt-value">${formatDate(payment.created_at)}</span>
        </div>
        
        <div class="receipt-row">
          <span class="receipt-label">Payment Method:</span>
          <span class="receipt-value">${payment.method.toUpperCase()}</span>
        </div>
        
        ${payment.method === 'upi' ? `
          <div class="receipt-row">
            <span class="receipt-label">UPI ID:</span>
            <span class="receipt-value">${payment.vpa || 'N/A'}</span>
          </div>
        ` : ''}
        
        ${payment.method === 'card' ? `
          <div class="receipt-row">
            <span class="receipt-label">Card Network:</span>
            <span class="receipt-value">${payment.card_network ? payment.card_network.toUpperCase() : 'N/A'}</span>
          </div>
          <div class="receipt-row">
            <span class="receipt-label">Card Last 4:</span>
            <span class="receipt-value">**** ${payment.card_last4 || 'N/A'}</span>
          </div>
        ` : ''}
        
        <div class="receipt-row total">
          <span class="receipt-label">Amount:</span>
          <span class="receipt-value">${formatAmount(payment.amount)}</span>
        </div>
        
        <div class="receipt-row">
          <span class="receipt-label">Status:</span>
          <span class="status-${payment.status}">${payment.status.toUpperCase()}</span>
        </div>
        
        ${payment.error_code ? `
          <div class="receipt-row">
            <span class="receipt-label">Error:</span>
            <span class="receipt-value" style="color: #dc3545;">${payment.error_description || payment.error_code}</span>
          </div>
        ` : ''}
        
        <div class="receipt-footer">
          <p>Thank you for using our payment gateway!</p>
          <p>This is a computer-generated receipt.</p>
          <p>Merchant: Test Merchant</p>
          <p>Date: ${new Date().toLocaleDateString()}</p>
        </div>
        
        <div style="text-align: center; margin-top: 20px;">
          <button onclick="window.print()" style="padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 16px;">
            Print Receipt
          </button>
          <button onclick="window.close()" style="padding: 10px 20px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 16px; margin-left: 10px;">
            Close
          </button>
        </div>
      </body>
      </html>
    `);
    receiptWindow.document.close();
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
          maxWidth: '1400px', 
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
            <h1 style={{ margin: 0 }}>Transactions</h1>
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
          <button 
            onClick={fetchPayments}
            style={{
              padding: '10px 20px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              marginBottom: '20px'
            }}
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 20px' }}>
        <div style={{
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              Loading transactions...
            </div>
          ) : error ? (
            <div style={{ 
              textAlign: 'center', 
              padding: '40px',
              color: '#666'
            }}>
              <p>{error}</p>
              <p style={{ marginTop: '20px' }}>
                Create some payments via the API first, then refresh this page.
              </p>
            </div>
          ) : payments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
              No transactions yet. Create your first payment via the API!
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>

              <table 
                data-test-id="transactions-table"
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '14px'
                }}
              >
                <thead>
                  <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Payment ID</th>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Order ID</th>
                    <th style={{ padding: '12px', textAlign: 'right' }}>Amount</th>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Method</th>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Status</th>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Created At</th>
                    <th style={{ padding: '12px', textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment) => (
                    <tr 
                      key={payment.id}
                      data-test-id={`transaction-row-${payment.id}`}
                      style={{ borderBottom: '1px solid #dee2e6' }}
                    >
                      <td 
                        data-test-id="payment-id"
                        style={{ padding: '12px', fontFamily: 'monospace', fontSize: '12px' }}
                      >
                        {payment.id}
                      </td>
                      <td 
                        data-test-id="order-id"
                        style={{ padding: '12px', fontFamily: 'monospace', fontSize: '12px' }}
                      >
                        {payment.order_id}
                      </td>
                      <td 
                        data-test-id="amount"
                        style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold' }}
                      >
                        {formatAmount(payment.amount)}
                      </td>
                      <td 
                        data-test-id="method"
                        style={{ padding: '12px', textTransform: 'uppercase' }}
                      >
                        {payment.method}
                      </td>
                      <td data-test-id="status" style={{ padding: '12px' }}>
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          backgroundColor: getStatusColor(payment.status) + '20',
                          color: getStatusColor(payment.status)
                        }}>
                          {payment.status}
                        </span>
                      </td>
                      <td 
                        data-test-id="created-at"
                        style={{ padding: '12px', fontSize: '12px', color: '#666' }}
                      >
                        {formatDate(payment.created_at)}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <button
                          onClick={() => printReceipt(payment)}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#28a745',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                          title="Print Receipt"
                        >
                          🖨️ Print
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ marginBottom: '20px', textAlign: 'center' }}>
                <button
                  onClick={() => {
                    payments.forEach(payment => printReceipt(payment));
                  }}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  🖨️ Print All Receipts
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Transactions;