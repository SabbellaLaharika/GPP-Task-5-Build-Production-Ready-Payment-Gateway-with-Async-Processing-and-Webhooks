import dotenv from 'dotenv';
import { paymentWorker } from './workers/paymentWorker';
import { webhookWorker } from './workers/webhookWorker';
import { refundWorker } from './workers/refundWorker';

dotenv.config();

console.log('👷 Worker Service Starting...');

const workers = [paymentWorker, webhookWorker, refundWorker];

workers.forEach(worker => {
    worker.on('active', (job) => {
        console.log(`[${job.queueName}] Job ${job.id} started`);
    });

    worker.on('completed', (job) => {
        console.log(`[${job.queueName}] Job ${job.id} completed`);
    });

    worker.on('failed', (job, err) => {
        console.error(`[${job?.queueName}] Job ${job?.id} failed: ${err.message}`);
    });
});

// Keep process alive
process.on('SIGTERM', async () => {
    console.log('Worker shutting down...');
    await Promise.all(workers.map(w => w.close()));
    process.exit(0);
});
