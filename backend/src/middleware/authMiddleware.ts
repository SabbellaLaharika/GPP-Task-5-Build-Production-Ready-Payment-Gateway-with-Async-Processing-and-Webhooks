import { Request, Response, NextFunction } from 'express';
import { query } from '../config/db';

// Extend Express Request to include merchant
declare global {
    namespace Express {
        interface Request {
            merchant?: any;
        }
    }
}

export const authenticateMerchant = async (req: Request, res: Response, next: NextFunction) => {
    const apiKey = req.headers['x-api-key'] as string;
    const apiSecret = req.headers['x-api-secret'] as string;

    if (!apiKey || !apiSecret) {
        return res.status(401).json({
            error: {
                code: 'AUTHENTICATION_ERROR',
                description: 'Invalid API credentials'
            }
        });
    }

    try {
        const result = await query(
            'SELECT * FROM merchants WHERE api_key = $1 AND api_secret = $2',
            [apiKey, apiSecret]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                error: {
                    code: 'AUTHENTICATION_ERROR',
                    description: 'Invalid API credentials'
                }
            });
        }

        const merchant = result.rows[0];
        if (!merchant.is_active) {
            return res.status(403).json({
                error: {
                    code: 'AUTHENTICATION_ERROR',
                    description: 'Merchant account is inactive'
                }
            });
        }

        req.merchant = merchant;
        next();
    } catch (error) {
        console.error('Authentication Error:', error);
        res.status(500).json({ error: { code: 'INTERNAL_SERVER_ERROR', description: 'Internal server error' } });
    }
};
