import { Request, Response } from 'express';
import pool from '../config/db';
import redis from '../config/redis';

export const getHealth = async (req: Request, res: Response) => {
    const healthStatus: any = {
        status: 'healthy',
        database: 'disconnected',
        redis: 'disconnected',
        worker: 'stopped',
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

            // Check Worker Heartbeat
            const lastHeartbeat = await redis.get('worker:heartbeat');
            if (lastHeartbeat) {
                const diff = Date.now() - new Date(lastHeartbeat).getTime();
                if (diff < 30000) { // 30 seconds threshold
                    healthStatus.worker = 'running';
                } else {
                    healthStatus.worker = 'stalled'; // Heartbeat exists but old
                }
            } else {
                healthStatus.worker = 'stopped'; // No heartbeat found
            }

        } else {
            throw new Error('Redis did not respond with PONG');
        }
    } catch (error) {
        healthStatus.status = 'unhealthy';
        healthStatus.redis = 'disconnected';
        healthStatus.worker = 'unknown'; // Can't check if redis is down
        statusCode = 503;
        console.error('Health Check - Redis Error:', error);
    }

    // If any component is down, mark overall status as unhealthy
    if (healthStatus.database !== 'connected' || healthStatus.redis !== 'connected' || healthStatus.worker !== 'running') {
        healthStatus.status = 'unhealthy';
        // Optionally keep 200 OK if you only want to report status, but usually Health Check returns 503 if critical deps down.
        // However, user might want to see the JSON. Sticking to 503 for critical failures is standard practice.
        if (statusCode === 200) statusCode = 503;
    }

    res.status(statusCode).json(healthStatus);
};
