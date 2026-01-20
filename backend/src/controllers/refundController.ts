import { Request, Response } from 'express';
import { query } from '../config/db';
import { v4 as uuidv4 } from 'uuid';
import { refundQueue } from '../config/queue';

const generateRefundId = () => {
    const randomChars = uuidv4().replace(/-/g, '').substring(0, 16);
    return `rfnd_${randomChars}`;
};

export const createRefund = async (req: Request, res: Response) => {
    // Route: POST /api/v1/payments/:payment_id/refunds
    const { payment_id } = req.params;
    const { amount, reason } = req.body;
    const merchant = req.merchant;

    // Basic Validation
    if (!amount || typeof amount !== 'number' || amount <= 0) {
        return res.status(400).json({ error: { code: 'BAD_REQUEST_ERROR', description: 'Invalid refund amount' } });
    }

    try {
        // 1. Fetch Payment & Validate Merchant Ownership
        const paymentResult = await query(
            'SELECT * FROM payments WHERE id = $1 AND merchant_id = $2',
            [payment_id, merchant.id]
        );

        if (paymentResult.rows.length === 0) {
            // Requirement: "If payment not found or doesn't belong to merchant, return 404 or 400"
            // Using 404 is cleaner for "Not Found" logic.
            return res.status(404).json({ error: { code: 'NOT_FOUND_ERROR', description: 'Payment not found' } });
        }
        const payment = paymentResult.rows[0];

        // 2. Validate Payment State (Must be 'success')
        if (payment.status !== 'success') {
            return res.status(400).json({ error: { code: 'BAD_REQUEST_ERROR', description: 'Payment not in refundable state' } });
        }

        // 3. Calculate Total Refunded (Processed + Pending)
        const refundsResult = await query(
            `SELECT COALESCE(SUM(amount), 0) as total_refunded 
             FROM refunds 
             WHERE payment_id = $1 AND status IN ('processed', 'pending')`,
            [payment_id]
        );
        const totalRefunded = parseInt(refundsResult.rows[0].total_refunded, 10);

        if (totalRefunded + amount > payment.amount) {
            return res.status(400).json({ error: { code: 'BAD_REQUEST_ERROR', description: 'Refund amount exceeds available amount' } });
        }

        // 4. Create Refund Record
        // Loop for ID collision check
        let refundId = generateRefundId();
        let unique = false;
        let retries = 0;

        while (!unique && retries < 3) {
            const exists = await query('SELECT id FROM refunds WHERE id = $1', [refundId]);
            if (exists.rows.length === 0) unique = true;
            else {
                refundId = generateRefundId();
                retries++;
            }
        }
        if (!unique) throw new Error('Collision Error');

        const created_at = new Date();

        const insertResult = await query(
            `INSERT INTO refunds (id, merchant_id, payment_id, amount, status, reason, created_at)
             VALUES ($1, $2, $3, $4, 'pending', $5, $6)
             RETURNING *`,
            [refundId, merchant.id, payment_id, amount, reason || null, created_at]
        );
        const refund = insertResult.rows[0];

        // 5. Enqueue Job
        await refundQueue.add('process-refund', { refundId: refund.id });

        // 6. Response
        res.status(201).json(refund);

    } catch (error) {
        console.error('Create Refund Error:', error);
        res.status(500).json({ error: { code: 'INTERNAL_SERVER_ERROR', description: 'Internal Server Error' } });
    }
};

export const getRefund = async (req: Request, res: Response) => {
    // Route: GET /api/v1/refunds/:refund_id (Top-level, but conceptually in refunds)
    // Parameter name in route definition should be :id to match this, or we destructure appropriately.
    // Assuming route is /:id based on typical REST.
    const { id } = req.params;
    const merchant = req.merchant;

    try {
        const result = await query('SELECT * FROM refunds WHERE id = $1 AND merchant_id = $2', [id, merchant.id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: { code: 'NOT_FOUND_ERROR', description: 'Refund not found' } });
        }
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: { code: 'INTERNAL_SERVER_ERROR', description: 'Internal Server Error' } });
    }
};
