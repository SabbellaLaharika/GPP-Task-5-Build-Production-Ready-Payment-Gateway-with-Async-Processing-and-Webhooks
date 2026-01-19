import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

const redisHost = process.env.REDIS_HOST || 'localhost';
const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);

console.log(`🔌 Connecting to Redis at ${redisHost}:${redisPort}`);

const redis = new Redis({
    host: redisHost,
    port: redisPort,
    maxRetriesPerRequest: null,
    retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
    },
});

redis.on('connect', () => {
    console.log('📦 Connected to Redis');
});

redis.on('error', (err) => {
    console.error('❌ Redis connection error:', err);
});

export default redis;
