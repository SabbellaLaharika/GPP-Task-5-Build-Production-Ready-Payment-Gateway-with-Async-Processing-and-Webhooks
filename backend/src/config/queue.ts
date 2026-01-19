import { Queue, Worker, QueueOptions, WorkerOptions } from 'bullmq';
import dotenv from 'dotenv';
import IORedis from 'ioredis';

dotenv.config();

const redisConnection = new IORedis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    maxRetriesPerRequest: null,
});

export const connection = redisConnection;

// Queue definitions
export const PAYMENT_QUEUE_NAME = 'payment-queue';
export const WEBHOOK_QUEUE_NAME = 'webhook-queue';
export const REFUND_QUEUE_NAME = 'refund-queue';

export const paymentQueue = new Queue(PAYMENT_QUEUE_NAME, { connection: connection as any });
export const webhookQueue = new Queue(WEBHOOK_QUEUE_NAME, { connection: connection as any });
export const refundQueue = new Queue(REFUND_QUEUE_NAME, { connection: connection as any });
