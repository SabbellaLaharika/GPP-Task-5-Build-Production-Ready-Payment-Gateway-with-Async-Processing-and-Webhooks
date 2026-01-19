require('dotenv').config();
const { Client } = require('pg');

const client = new Client({
    connectionString: process.env.DATABASE_URL,
});

async function seedData() {
    try {
        console.log('Connecting to database...');
        await client.connect();
        console.log('✅ Connected to database');

        const testMerchant = {
            id: '550e8400-e29b-41d4-a716-446655440000',
            name: 'Test Merchant',
            email: 'test@example.com',
            api_key: 'key_test_abc123',
            api_secret: 'secret_test_xyz789',
            webhook_secret: 'whsec_test_abc123'
        };

        // Check if merchant exists
        const checkRes = await client.query('SELECT id FROM merchants WHERE email = $1', [testMerchant.email]);

        if (checkRes.rows.length > 0) {
            console.log('⚠️  Test merchant already exists. Skipping insertion.');
        } else {
            console.log('🌱 Inserting test merchant...');
            await client.query(
                `INSERT INTO merchants (id, name, email, api_key, api_secret, webhook_secret)
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [
                    testMerchant.id,
                    testMerchant.name,
                    testMerchant.email,
                    testMerchant.api_key,
                    testMerchant.api_secret,
                    testMerchant.webhook_secret
                ]
            );
            console.log('✅ Test merchant created successfully');
        }

    } catch (err) {
        console.error('❌ Seeding failed:', err);
        process.exit(1);
    } finally {
        await client.end();
    }
}

seedData();
