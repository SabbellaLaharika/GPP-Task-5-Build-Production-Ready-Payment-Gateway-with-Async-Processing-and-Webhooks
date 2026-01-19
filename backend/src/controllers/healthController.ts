import { Request, Response } from 'express';
import pool from '../config/db';
import redis from '../config/redis';

export const getHealth = async (req: Request, res: Response) => {
    const healthStatus: any = {
        status: 'healthy',
        database: 'disconnected',
        redis: 'disconnected',
        worker: 'running', // Placeholder for now, or check via Redis presence
        timestamp: new Date().toISOString(),
    };

    let statusCode = 200;

    try {
        // Check Database
        await pool.query('SELECT 1');
        healthStatus.database = 'connected';
    } catch (error) {
        healthStatus.status = 'unhealthy';
        healthStatus.database = 'disconnected';
        statusCode = 503;
        console.error('Health Check - DB Error:', error);
    }

    try {
        // Check Redis
        const pong = await redis.ping();
        if (pong === 'PONG') {
            healthStatus.redis = 'connected';
        } else {
            throw new Error('Redis did not respond with PONG');
        }
    } catch (error) {
        healthStatus.status = 'unhealthy';
        healthStatus.redis = 'disconnected';
        statusCode = 503;
        console.error('Health Check - Redis Error:', error);
    }

    res.status(statusCode).json(healthStatus);
};
