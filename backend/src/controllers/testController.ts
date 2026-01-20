import { Request, Response } from 'express';
import { query } from '../config/db';

import { paymentQueue, webhookQueue, refundQueue, connection } from '../config/queue';

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

export const getJobStatus = async (req: Request, res: Response) => {
    try {
        // Aggregate stats from all queues
        const paymentStats = await paymentQueue.getJobCounts('waiting', 'active', 'completed', 'failed');
        const webhookStats = await webhookQueue.getJobCounts('waiting', 'active', 'completed', 'failed');
        const refundStats = await refundQueue.getJobCounts('waiting', 'active', 'completed', 'failed');

        // Check worker health via Redis Heartbeat
        const heartbeat = await connection.get('worker:heartbeat');
        console.error('DEBUG_STATUS_CHECK_123 Heartbeat:', heartbeat);
        console.error('DEBUG_STATUS_CHECK_123 PaymentStats:', JSON.stringify(paymentStats));

        let workerStatus = 'stopped';
        if (heartbeat) {
            const lastHeartbeat = parseInt(heartbeat, 10);
            if (Date.now() - lastHeartbeat < 30000) {
                workerStatus = 'running';
            }
        }

        res.json({
            pending: paymentStats.waiting + webhookStats.waiting + refundStats.waiting,
            processing: paymentStats.active + webhookStats.active + refundStats.active,
            completed: paymentStats.completed + webhookStats.completed + refundStats.completed,
            failed: paymentStats.failed + webhookStats.failed + refundStats.failed,
            worker_status: workerStatus
        });
    } catch (error) {
        console.error('Job Status Error:', error);
        res.status(500).json({ error: { code: 'INTERNAL_SERVER_ERROR', description: 'Internal Server Error' } });
    }
};
