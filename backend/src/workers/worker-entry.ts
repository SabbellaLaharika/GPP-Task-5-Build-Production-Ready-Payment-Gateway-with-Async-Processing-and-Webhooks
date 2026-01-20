import { paymentWorker } from './paymentWorker';
import { webhookWorker } from './webhookWorker';
import { refundWorker } from './refundWorker';
import { connection } from '../config/queue';

console.log('Starting workers...');

// Ensure workers are imported so they start listening
const workers = [paymentWorker, webhookWorker, refundWorker];

// Heartbeat Loop
setInterval(async () => {
    try {
        await connection.set('worker:heartbeat', Date.now().toString(), 'EX', 60);
        // console.log('Worker heartbeat updated');
    } catch (error) {
        console.error('Failed to update worker heartbeat:', error);
    }
}, 10000);

console.log(`[Worker] Started ${workers.length} workers.`);

// Handle graceful shutdown
const gracefulShutdown = async () => {
    console.log('Shutting down workers...');
    await Promise.all(workers.map(w => w.close()));
    connection.disconnect();
    process.exit(0);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
