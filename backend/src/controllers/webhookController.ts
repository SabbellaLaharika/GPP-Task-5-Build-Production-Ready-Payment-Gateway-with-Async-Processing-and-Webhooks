import { Request, Response } from 'express';
import { query } from '../config/db';
import { webhookQueue } from '../config/queue';

// GET /api/v1/webhooks?limit=10&offset=0
export const getWebhooks = async (req: Request, res: Response) => {
    const merchant = req.merchant;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = parseInt(req.query.offset as string) || 0;

    try {
        const result = await query(
            `SELECT id, event, status, attempts, created_at, last_attempt_at, response_code 
             FROM webhook_logs 
             WHERE merchant_id = $1 
             ORDER BY created_at DESC 
             LIMIT $2 OFFSET $3`,
            [merchant.id, limit, offset]
        );

        const countResult = await query(
            'SELECT COUNT(*) FROM webhook_logs WHERE merchant_id = $1',
            [merchant.id]
        );
        const total = parseInt(countResult.rows[0].count, 10);

        res.json({
            data: result.rows,
            total,
            limit,
            offset
        });
    } catch (error) {
        console.error('Get Webhooks Error:', error);
        res.status(500).json({ error: { code: 'INTERNAL_SERVER_ERROR', description: 'Internal Server Error' } });
    }
};

// POST /api/v1/webhooks/:id/retry
export const retryWebhook = async (req: Request, res: Response) => {
    const { id } = req.params;
    const merchant = req.merchant;

    try {
        // 1. Fetch Log
        const logResult = await query(
            'SELECT * FROM webhook_logs WHERE id = $1 AND merchant_id = $2',
            [id, merchant.id]
        );

        if (logResult.rows.length === 0) {
            return res.status(404).json({ error: { code: 'NOT_FOUND_ERROR', description: 'Webhook log not found' } });
        }
        const log = logResult.rows[0];

        // 2. Reset Status & Attempts
        await query(
            "UPDATE webhook_logs SET attempts = 0, status = 'pending', next_retry_at = NULL, updated_at = NOW() WHERE id = $1",
            [id]
        );

        // 3. Enqueue Job
        await webhookQueue.add('deliver-webhook', {
            merchantId: merchant.id,
            event: log.event,
            payload: log.payload,
            logId: log.id,
            attemptNumber: 1
        });

        res.json({
            id: log.id,
            status: 'pending',
            message: 'Webhook retry scheduled'
        });

    } catch (error) {
        console.error('Retry Webhook Error:', error);
        res.status(500).json({ error: { code: 'INTERNAL_SERVER_ERROR', description: 'Internal Server Error' } });
    }
};
