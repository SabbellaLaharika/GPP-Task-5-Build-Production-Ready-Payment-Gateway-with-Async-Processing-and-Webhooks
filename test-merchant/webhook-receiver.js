// test-merchant/webhook-receiver.js
const express = require('express');
const crypto = require('crypto');

const app = express();
app.use(express.json());

app.post('/webhook', (req, res) => {
    const signature = req.headers['x-webhook-signature'];

    // IMPORTANT: Verify signature using raw body is best practice, 
    // but here we use JSON.stringify(req.body) to match the screenshots instruction 
    // strictly, assuming the backend sends compact JSON. 
    // In a real prod app, use verify: (req, res, buf) to get raw body.
    const payload = JSON.stringify(req.body);

    // Verify signature
    // Secret must match the one in your Merchant Config (whsec_test_abc123)
    const expectedSignature = crypto
        .createHmac('sha256', 'whsec_test_abc123')
        .update(payload)
        .digest('hex');

    if (signature !== expectedSignature) {
        console.log('❌ Invalid signature');
        console.log('Received:', signature);
        console.log('Expected:', expectedSignature);
        return res.status(401).send('Invalid signature');
    }

    console.log('✅ Webhook verified:', req.body.event);
    if (req.body.data && req.body.data.payment) {
        console.log('Payment ID:', req.body.data.payment.id);
        console.log('Status:', req.body.data.payment.status);
    }

    res.status(200).send('OK');
});

app.listen(4000, () => {
    console.log('Test merchant webhook running on port 4000');
    console.log('URL: http://localhost:4000/webhook');
    console.log('Docker URL: http://host.docker.internal:4000/webhook');
});
