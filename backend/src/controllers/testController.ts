import { Request, Response } from 'express';
import { query } from '../config/db';

export const getTestMerchant = async (req: Request, res: Response) => {
    try {
        const email = 'test@example.com';
        const result = await query('SELECT id, email, api_key FROM merchants WHERE email = $1', [email]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: { code: 'NOT_FOUND_ERROR', description: 'Test merchant not found' } });
        }

        const merchant = result.rows[0];
        res.status(200).json({
            id: merchant.id,
            email: merchant.email,
            api_key: merchant.api_key,
            seeded: true
        });

    } catch (error) {
        console.error('Test Endpoint Error:', error);
        res.status(500).json({ error: { code: 'INTERNAL_SERVER_ERROR', description: 'Internal Server Error' } });
    }
};
