import { Request, Response } from 'express';
import { query } from '../config/db';
import { v4 as uuidv4 } from 'uuid';
import { paymentQueue, webhookQueue } from '../config/queue';
import { validateVPA, validateLuhn, detectCardNetwork, validateExpiry } from '../utils/validation';

const generatePaymentId = () => {
    const randomChars = uuidv4().replace(/-/g, '').substring(0, 16);
    return `pay_${randomChars}`;
};

export const createPayment = async (req: Request, res: Response) => {
    const body = req.body;
    const merchant = req.merchant;
    const idempotencyKey = req.headers['idempotency-key'] as string;

    const order_id = body.order_id;
    const method = body.method;
    const vpa = method == "upi" ? body.vpa : "";
    const card = method == "card" ? body.card : {};
    try {
        // 0. Idempotency Check
        if (idempotencyKey) {
            const idempotencyResult = await query(
                'SELECT * FROM idempotency_keys WHERE key = $1 AND merchant_id = $2',
                [idempotencyKey, merchant.id]
            );

            if (idempotencyResult.rows.length > 0) {
                const record = idempotencyResult.rows[0];
                const now = new Date();

                if (new Date(record.expires_at) > now) {
                    // console.log(`[Idempotency] returning cached response for key: ${idempotencyKey}`);
                    return res.status(201).json(record.response);
                } else {
                    // Expired, delete and continue
                    await query('DELETE FROM idempotency_keys WHERE key = $1 AND merchant_id = $2', [idempotencyKey, merchant.id]);
                }
            }
        }

        // 1. Verify Order
        let order;
        try {
            const orderResult = await query('SELECT * FROM orders WHERE id = $1 AND merchant_id = $2', [order_id, merchant.id]);

            if (orderResult.rows.length === 0) {
                return res.status(404).json({
                    error: {
                        code: 'NOT_FOUND_ERROR',
                        description: 'Order not found or does not belong to merchant'
                    }
                });
            }
            order = orderResult.rows[0];

            // 1.1 Check for existing payments for this order
            // Requirement: Block creation if payment is 'pending' or 'success'. Allow if 'failed'.
            const existingPaymentResult = await query(
                `SELECT id, status FROM payments 
                 WHERE order_id = $1 
                 AND status IN ('pending', 'processing', 'success')`,
                [order_id]
            );

            if (existingPaymentResult.rows.length > 0) {
                return res.status(400).json({
                    error: {
                        code: 'BAD_REQUEST_ERROR',
                        description: `Order already has a payment in ${existingPaymentResult.rows[0].status} status`
                    }
                });
            }

        } catch (error) {
            return res.status(500).json({ error: { code: 'INTERNAL_SERVER_ERROR', description: 'DB Error' } });
        }

        // 2. method-specific validation & field extraction
        let methodSpecificFields = {};
        let cardNetwork = null;
        let cardLast4 = null;

        if (method === 'upi') {
            if (!vpa || !validateVPA(vpa)) {
                return res.status(400)
                    .json({ error: { code: 'INVALID_VPA', description: 'Invalid VPA format' } });
            }
            methodSpecificFields = { vpa };
        } else if (method === 'card') {

            // console.log("Card details", card);
            // console.log("Create Payment with card details", req.body.);
            if (!card) return res.status(400).json({ error: { code: 'BAD_REQUEST_ERROR', description: 'Card details missing' } });

            const { number, expiry_month, expiry_year, cvv, holder_name } = card;

            if (!validateLuhn(number)) {
                return res.status(400).json({ error: { code: 'INVALID_CARD', description: 'Invalid card number' } });
            }

            if (!validateExpiry(expiry_month, expiry_year)) {
                return res.status(400).json({ error: { code: 'EXPIRED_CARD', description: 'Card has expired' } });
            }

            cardNetwork = detectCardNetwork(number);
            cardLast4 = number.slice(-4);
            methodSpecificFields = {
                card_network: cardNetwork,
                card_last4: cardLast4
            };
        } else {
            return res.status(400).json({ error: { code: 'BAD_REQUEST_ERROR', description: 'Invalid payment method' } });
        }

        // 3. Generate ID & Collision Check
        let paymentId = generatePaymentId();
        let retries = 0;
        let unique = false;
        while (!unique && retries < 3) {
            const existing = await query('SELECT id FROM payments WHERE id = $1', [paymentId]);
            if (existing.rows.length === 0) unique = true;
            else {
                paymentId = generatePaymentId();
                retries++;
            }
        }
        if (!unique) throw new Error('Collision Error');

        // 4. Create Payment Record (Pending)
        const created_at = new Date();
        const updated_at = created_at;

        const result = await query(
            `INSERT INTO payments (
                id, merchant_id, order_id, amount, currency, status, method, 
                card_network, card_last4, vpa, created_at, updated_at, captured
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, FALSE)
            RETURNING *`,
            [
                paymentId, merchant.id, order.id, order.amount, order.currency,
                'pending', method, cardNetwork, cardLast4, vpa || null,
                created_at, updated_at
            ]
        );
        const payment = result.rows[0];

        // 5. Trigger Background Job
        await paymentQueue.add('process-payment', { paymentId: payment.id });

        // 6. Trigger Webhooks (payment.created, payment.pending)
        const commonPayload = {
            id: payment.id,
            order_id: payment.order_id,
            amount: payment.amount,
            currency: payment.currency,
            method: payment.method,
            status: payment.status,
            created_at: payment.created_at,
            vpa: payment.vpa,
            card_network: payment.card_network,
            card_last4: payment.card_last4
        };

        // Emit payment.created
        await webhookQueue.add('deliver-webhook', {
            merchantId: merchant.id,
            event: 'payment.created',
            payload: {
                event: 'payment.created',
                timestamp: Math.floor(Date.now() / 1000),
                data: { payment: commonPayload }
            }
        });

        // Emit payment.pending
        await webhookQueue.add('deliver-webhook', {
            merchantId: merchant.id,
            event: 'payment.pending',
            payload: {
                event: 'payment.pending',
                timestamp: Math.floor(Date.now() / 1000),
                data: { payment: commonPayload }
            }
        });

        // 6. Return Response
        const responseData: any = {
            id: payment.id,
            order_id: payment.order_id,
            amount: payment.amount,
            currency: payment.currency,
            method: payment.method,
            status: payment.status,
            created_at: payment.created_at,
            updated_at: payment.updated_at
        };

        if (method === 'upi') {
            responseData.vpa = payment.vpa;
        } else {
            responseData.card_network = payment.card_network;
            responseData.card_last4 = payment.card_last4;
        }

        // 7. Store Idempotency Key (24h expiry)
        if (idempotencyKey) {
            const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
            await query(
                `INSERT INTO idempotency_keys (key, merchant_id, response, expires_at)
                 VALUES ($1, $2, $3, $4)`,
                [idempotencyKey, merchant.id, responseData, expiresAt]
            );
        }

        res.status(201).json(responseData);

    } catch (error) {
        console.error('Create Payment Error:', error);
        res.status(500).json({ error: { code: 'INTERNAL_SERVER_ERROR', description: 'Internal server error' } });
    }
};

export const getPayment = async (req: Request, res: Response) => {
    const { id } = req.params;
    const merchant = req.merchant;

    try {
        const result = await query('SELECT * FROM payments WHERE id = $1 AND merchant_id = $2', [id, merchant.id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: { code: 'NOT_FOUND_ERROR', description: 'Payment not found' } });
        }
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: { code: 'INTERNAL_SERVER_ERROR', description: 'Internal Server Error' } });
    }
};

export const capturePayment = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { amount } = req.body;
    const merchant = req.merchant;

    try {
        const result = await query('SELECT * FROM payments WHERE id = $1 AND merchant_id = $2', [id, merchant.id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: { code: 'NOT_FOUND_ERROR', description: 'Payment not found' } });
        }

        const payment = result.rows[0];

        // Validation: Verify payment is in capturable state
        if (payment.status !== 'success' || payment.captured === true) {
            return res.status(400).json({
                error: {
                    code: 'BAD_REQUEST_ERROR',
                    description: 'Payment not in capturable state'
                }
            });
        }

        // Update captured = true
        const updateResult = await query(
            'UPDATE payments SET captured = TRUE, updated_at = NOW() WHERE id = $1 RETURNING *',
            [id]
        );
        const updatedPayment = updateResult.rows[0];


        const responseData = {
            ...updatedPayment,
            captured: true
        };

        res.status(200).json(responseData);

    } catch (error) {
        console.error('Capture Error:', error);
        res.status(500).json({ error: { code: 'INTERNAL_SERVER_ERROR', description: 'Internal Server Error' } });
    }
};

export const getPayments = async (req: Request, res: Response) => {
    const merchant = req.merchant;

    try {
        const result = await query(
            `SELECT p.*, 
                    COALESCE((SELECT SUM(amount) FROM refunds r WHERE r.payment_id = p.id AND r.status = 'processed'), 0) as refunded_amount
             FROM payments p 
             WHERE p.merchant_id = $1 
             ORDER BY p.created_at DESC`,
            [merchant.id]
        );
        res.json(result.rows);
    } catch (error) {
        console.error('List Payments Error:', error);
        res.status(500).json({ error: { code: 'INTERNAL_SERVER_ERROR', description: 'Internal Server Error' } });
    }
};
