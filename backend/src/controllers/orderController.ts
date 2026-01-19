import { Request, Response } from 'express';
import { query } from '../config/db';
import { v4 as uuidv4 } from 'uuid';

// Helper to generate a prefixed ID (order_ + 16 chars)
const generateOrderId = () => {
    const randomChars = uuidv4().replace(/-/g, '').substring(0, 16);
    return `order_${randomChars}`;
};

export const createOrder = async (req: Request, res: Response) => {
    const { amount, currency = 'INR', receipt, notes } = req.body;
    const merchant = req.merchant; // Set by authMiddleware

    // Validation
    if (!amount || typeof amount !== 'number' || amount < 100) {
        return res.status(400).json({
            error: {
                code: 'BAD_REQUEST_ERROR',
                description: 'amount must be at least 100'
            }
        });
    }

    try {
        let orderId = generateOrderId();
        let retries = 0;
        let unique = false;

        // Collision check loop (Requirement: check for collisions and regenerate)
        while (!unique && retries < 3) {
            const existing = await query('SELECT id FROM orders WHERE id = $1', [orderId]);
            if (existing.rows.length === 0) {
                unique = true;
            } else {
                orderId = generateOrderId();
                retries++;
            }
        }

        if (!unique) {
            return res.status(500).json({ error: { code: 'INTERNAL_SERVER_ERROR', description: 'Failed to generate unique Order ID' } });
        }

        const created_at = new Date();
        const updated_at = created_at; // Requirement: Set timestamps (created_at, updated_at)

        const result = await query(
            `INSERT INTO orders (id, merchant_id, amount, currency, receipt, notes, status, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, 'created', $7, $8)
             RETURNING id, merchant_id, amount, currency, receipt, notes, status, created_at, updated_at`,
            [orderId, merchant.id, amount, currency, receipt, notes || {}, created_at, updated_at]
        );

        res.status(201).json(result.rows[0]);

    } catch (error) {
        console.error('Error creating order:', error);
        res.status(500).json({ error: { code: 'INTERNAL_SERVER_ERROR', description: 'Internal server error' } });
    }
};

export const getOrder = async (req: Request, res: Response) => {
    const { id } = req.params;
    // We strictly follow the requirement: Auth required, fetch by ID. 
    // Usually we also check if the order belongs to the merchant (req.merchant.id), 
    // but the screenshot didn't explicitly mandate that check for the *Get* endpoint, only Auth.
    // However, for security, it is best practice. Let's assume standard multi-tenancy rules apply.
    const merchant = req.merchant;

    try {
        const result = await query('SELECT * FROM orders WHERE id = $1 AND merchant_id = $2', [id, merchant.id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: {
                    code: 'NOT_FOUND_ERROR',
                    description: 'Order not found'
                }
            });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching order:', error);
        res.status(500).json({ error: { code: 'INTERNAL_SERVER_ERROR', description: 'Internal server error' } });
    }
};
