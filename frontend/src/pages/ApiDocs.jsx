import React from 'react';

const ApiDocs = () => {
    return (
        <div className="container" data-test-id="api-docs">
            <h2>Integration Guide</h2>

            <section data-test-id="section-create-order" className="doc-section">
                <h3>1. Create Order</h3>
                <p>Create an order from your backend before initializing checkout.</p>
                <pre data-test-id="code-snippet-create-order">
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
            </section>

            <section data-test-id="section-sdk-integration" className="doc-section">
                <h3>2. SDK Integration</h3>
                <p>Include the SDK script and initialize the payment.</p>
                <pre data-test-id="code-snippet-sdk">
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
            </section>

            <section data-test-id="section-webhook-verification" className="doc-section">
                <h3>3. Verify Webhook Signature</h3>
                <p>Verify the `X-Webhook-Signature` header matches the HMAC-SHA256 of the payload.</p>
                <pre data-test-id="code-snippet-webhook">
                    <code>{`const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');

  return signature === expectedSignature;
}`}</code>
                </pre>
            </section>
        </div>
    );
};

export default ApiDocs;
