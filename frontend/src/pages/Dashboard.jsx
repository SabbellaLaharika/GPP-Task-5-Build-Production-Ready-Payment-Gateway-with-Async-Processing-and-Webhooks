import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { TEST_MERCHANT } from '../services/api';
import axios from 'axios';

function Dashboard() {
  const navigate = useNavigate();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalTransactions: 0,
    totalAmount: 0,
    successRate: 0
  });

  useEffect(() => {
    const email = localStorage.getItem('merchantEmail');
    if (!email) {
      navigate('/login');
      return;
    }

    fetchPayments();
  }, [navigate]);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      // Note: API doesn't have /payments list endpoint yet, we'll mock it
      // In production, you'd call getPayments() here
      const response = await axios.get('http://localhost:8000/api/v1/payments', {
        headers: {
          'X-Api-Key': TEST_MERCHANT.apiKey,
          'X-Api-Secret': TEST_MERCHANT.apiSecret
        }
      });
      setPayments(response.data || []);
      calculateStats(response.data || []);
    } catch (error) {
      console.error('Error fetching payments:', error);
      setPayments([]);
      calculateStats([]);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (paymentsData) => {
    const total = paymentsData.length;
    const totalAmount = paymentsData.reduce((sum, p) => sum + (p.amount || 0), 0);
    const successful = paymentsData.filter(p => p.status === 'success').length;
    const successRate = total > 0 ? ((successful / total) * 100).toFixed(2) : 0;

    setStats({
      totalTransactions: total,
      totalAmount: totalAmount / 100, // Convert paise to rupees
      successRate: successRate
    });
  };

  const handleLogout = () => {
    localStorage.removeItem('merchantEmail');
    navigate('/login');
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
          <h1 style={{ margin: 0 }}>Payment Gateway Dashboard</h1>
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

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px' }}>
        {/* API Credentials */}
        <div data-test-id="api-credentials" style={{
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '8px',
          marginBottom: '20px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <h2>API Credentials</h2>
          <div style={{ marginTop: '15px' }}>
            <div style={{ marginBottom: '10px' }}>
              <strong>API Key:</strong>
              <code data-test-id="api-key" style={{
                display: 'block',
                padding: '10px',
                backgroundColor: '#f8f9fa',
                borderRadius: '4px',
                marginTop: '5px'
              }}>
                {TEST_MERCHANT.apiKey}
              </code>
            </div>
            <div>
              <strong>API Secret:</strong>
              <code data-test-id="api-secret" style={{
                display: 'block',
                padding: '10px',
                backgroundColor: '#f8f9fa',
                borderRadius: '4px',
                marginTop: '5px'
              }}>
                {TEST_MERCHANT.apiSecret}
              </code>
            </div>
          </div>
        </div>
        {loading && (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            Loading dashboard...
          </div>
        )}
        {/* Statistics */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '20px' }}>
          <div data-test-id="total-transactions" style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <div style={{ fontSize: '14px', color: '#666', marginBottom: '5px' }}>Total Transactions</div>
            <div style={{ fontSize: '32px', fontWeight: 'bold' }}>{stats.totalTransactions}</div>
          </div>

          <div data-test-id="total-amount" style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <div style={{ fontSize: '14px', color: '#666', marginBottom: '5px' }}>Total Amount</div>
            <div style={{ fontSize: '32px', fontWeight: 'bold' }}>₹{stats.totalAmount.toFixed(2)}</div>
          </div>

          <div data-test-id="success-rate" style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <div style={{ fontSize: '14px', color: '#666', marginBottom: '5px' }}>Success Rate</div>
            <div style={{ fontSize: '32px', fontWeight: 'bold' }}>{stats.successRate}%</div>
          </div>
        </div>

        {/* Quick Links */}
        <div style={{
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <h2>Quick Actions</h2>
          <div style={{ display: 'flex', gap: '10px', marginTop: '10px', flexWrap: 'wrap' }}>
            <Link
              to="/dashboard/create-order"
              style={{
                display: 'inline-block',
                padding: '10px 20px',
                backgroundColor: '#28a745',
                color: 'white',
                textDecoration: 'none',
                borderRadius: '4px'
              }}
            >
              + Create New Order
            </Link>
            <Link
              to="/dashboard/transactions"
              style={{
                display: 'inline-block',
                padding: '10px 20px',
                backgroundColor: '#007bff',
                color: 'white',
                textDecoration: 'none',
                borderRadius: '4px'
              }}
            >
              View All Transactions
            </Link>
            <Link
              to="/dashboard/webhooks"
              style={{
                display: 'inline-block',
                padding: '10px 20px',
                backgroundColor: '#6610f2',
                color: 'white',
                textDecoration: 'none',
                borderRadius: '4px'
              }}
            >
              Webhook Config
            </Link>
            <Link
              to="/dashboard/docs"
              style={{
                display: 'inline-block',
                padding: '10px 20px',
                backgroundColor: '#17a2b8',
                color: 'white',
                textDecoration: 'none',
                borderRadius: '4px'
              }}
            >
              Request Documentation
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;