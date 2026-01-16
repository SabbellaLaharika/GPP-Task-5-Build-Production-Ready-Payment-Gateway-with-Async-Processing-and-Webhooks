import React from 'react';

const ApiDocs = () => {
  const handleLogout = () => {
    localStorage.removeItem('merchantEmail');
    window.location.href = '/login';
  };

  return (
    <div className="page-container">
      <div className="dashboard-header">
        <div className="header-inner">
          <div className="header-left">
            <a href="/dashboard" className="back-link">
              ← Back to Dashboard
            </a>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>Integration Guide</h1>
          </div>
          <button onClick={handleLogout} className="btn btn-danger btn-sm">
            Logout
          </button>
        </div>
      </div>

      <div className="main-content">
        <div className="card">
          <h2>1. Create Order</h2>
          <p style={{ marginBottom: '15px', color: '#666' }}>
            First, create an order from your backend to get an <code>order_id</code>.
          </p>
          <div style={{ background: '#282c34', padding: '20px', borderRadius: '8px', overflowX: 'auto' }}>
            <pre style={{ color: '#abb2bf', margin: 0 }}>
              <code>{`curl -X POST http://localhost:8000/api/v1/orders \\
  -H "X-Api-Key: key_test_abc123" \\
  -H "X-Api-Secret: secret_test_xyz789" \\
  -H "Content-Type: application/json" \\
  -d '{
    "amount": 50000,
    "currency": "INR",
    "receipt": "receipt_123"
  }'`}</code>
            </pre>
          </div>
        </div>

        <div className="card">
          <h2>2. SDK Integration</h2>
          <p style={{ marginBottom: '15px', color: '#666' }}>
            Include the Javascript SDK in your frontend and initialize it with the <code>order_id</code>.
          </p>
          <div style={{ background: '#282c34', padding: '20px', borderRadius: '8px', overflowX: 'auto' }}>
            <pre style={{ color: '#abb2bf', margin: 0 }}>
              <code>{`<!-- Include SDK -->
<script src="http://localhost:3001/checkout.js"></script>

<script>
const checkout = new PaymentGateway({
  key: 'key_test_abc123',
  orderId: 'order_xyz', // from step 1
  onSuccess: (response) => {
    console.log('Payment ID:', response.paymentId);
  },
  onFailure: (error) => {
    console.log('Payment Failed:', error);
  }
});

// Open Modal
checkout.open();
</script>`}</code>
            </pre>
          </div>
        </div>

        <div className="card">
          <h2>3. Verify Webhook Signature</h2>
          <p style={{ marginBottom: '15px', color: '#666' }}>
            Secure your webhooks by verifying the HMAC-SHA256 signature.
          </p>
          <div style={{ background: '#282c34', padding: '20px', borderRadius: '8px', overflowX: 'auto' }}>
            <pre style={{ color: '#abb2bf', margin: 0 }}>
              <code>{`const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');

  return signature === expectedSignature;
}`}</code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApiDocs;
