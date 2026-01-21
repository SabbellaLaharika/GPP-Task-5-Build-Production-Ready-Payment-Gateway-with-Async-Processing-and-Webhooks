import { Request, Response } from 'express';
import { query } from '../config/db';
import crypto from 'crypto';

// GET /api/v1/merchant
export const getMerchantConfig = async (req: Request, res: Response) => {
    const merchant = req.merchant; // From authMiddleware
    try {
        // Fetch fresh data
        const result = await query('SELECT webhook_url, webhook_secret FROM merchants WHERE id = $1', [merchant.id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Merchant not found' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Get Merchant Config Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// POST /api/v1/merchant/webhook-config
export const updateWebhookConfig = async (req: Request, res: Response) => {
    const merchant = req.merchant;
    const { webhook_url } = req.body;

    try {
        await query('UPDATE merchants SET webhook_url = $1 WHERE id = $2', [webhook_url, merchant.id]);
        const result = await query('SELECT webhook_url, webhook_secret FROM merchants WHERE id = $1', [merchant.id]);

        // If secret is null, generate one automatically
        let message = 'Webhook URL updated';
        if (!result.rows[0].webhook_secret) {
            const newSecret = `whsec_${crypto.randomBytes(16).toString('hex')}`;
            await query('UPDATE merchants SET webhook_secret = $1 WHERE id = $2', [newSecret, merchant.id]);
            message += ' and secret generated';
        }

        res.json({ message });
    } catch (error) {
        console.error('Update Webhook Config Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// POST /api/v1/merchant/regenerate-secret
export const regenerateWebhookSecret = async (req: Request, res: Response) => {
    const merchant = req.merchant;
    try {
        const newSecret = `whsec_${crypto.randomBytes(16).toString('hex')}`;
        await query('UPDATE merchants SET webhook_secret = $1 WHERE id = $2', [newSecret, merchant.id]);

        res.json({
            message: 'Webhook secret regenerated',
            webhook_secret: newSecret
        });
    } catch (error) {
        console.error('Regenerate Secret Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
