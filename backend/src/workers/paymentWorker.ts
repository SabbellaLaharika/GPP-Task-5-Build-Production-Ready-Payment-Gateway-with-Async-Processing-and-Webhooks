import { Worker, Job } from 'bullmq';
import { connection, PAYMENT_QUEUE_NAME, webhookQueue } from '../config/queue';
import { query } from '../config/db';

interface PaymentJobData {
    paymentId: string;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const paymentWorker = new Worker(PAYMENT_QUEUE_NAME, async (job: Job<PaymentJobData>) => {
    const { paymentId } = job.data;
    console.log(`[PaymentWorker] Processing payment: ${paymentId}`);

    try {
        // 1. Fetch payment
        const paymentResult = await query('SELECT * FROM payments WHERE id = $1', [paymentId]);
        if (paymentResult.rows.length === 0) {
            console.error(`[PaymentWorker] Payment not found: ${paymentId}`);
            return; // Or throw error to retry
        }
        const payment = paymentResult.rows[0];

        // 2. Simulate Delay
        const isTestMode = process.env.TEST_MODE === 'true';
        let delay = Math.floor(Math.random() * 5000) + 5000; // 5-10 seconds

        if (isTestMode && process.env.TEST_PROCESSING_DELAY) {
            delay = parseInt(process.env.TEST_PROCESSING_DELAY, 10);
        }

        console.log(`[PaymentWorker] Simulating delay of ${delay}ms`);
        await sleep(delay);

        // 3. Determine Outcome
        let success = false;
        let errorDescription = null;

        if (isTestMode && process.env.TEST_PAYMENT_SUCCESS !== undefined) {
            success = process.env.TEST_PAYMENT_SUCCESS === 'true';
        } else {
            const random = Math.random();
            if (payment.method === 'upi') {
                success = random < 0.90; // 90% success
            } else {
                success = random < 0.95; // 95% success
            }
        }

        if (!success) {
            errorDescription = 'Payment validation failed (Simulated)';
        }

        const newStatus = success ? 'success' : 'failed';
        const processedAt = new Date();

        // 4. Update Database
        await query(
            `UPDATE payments 
         SET status = $1, 
             updated_at = $2,
             error_description = $3,
             error_code = $4
         WHERE id = $5`,
            [newStatus, processedAt, errorDescription, success ? null : 'PAYMENT_FAILED', paymentId]
        );

        console.log(`[PaymentWorker] Payment ${paymentId} ${newStatus}`);

        // 5. Enqueue Webhook
        const eventType = success ? 'payment.success' : 'payment.failed';
        await webhookQueue.add('deliver-webhook', {
            merchantId: payment.merchant_id,
            event: eventType,
            payload: {
                payment_id: payment.id,
                amount: payment.amount,
                status: newStatus,
                order_id: payment.order_id
            }
        });

    } catch (error) {
        console.error(`[PaymentWorker] Error processing payment ${paymentId}:`, error);
        throw error; // Triggers BullMQ retry
    }
}, { connection: connection as any });
