import { Worker, Job } from 'bullmq';
import { connection, REFUND_QUEUE_NAME, webhookQueue } from '../config/queue';
import { query } from '../config/db';

interface RefundJobData {
    refundId: string;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const refundWorker = new Worker(REFUND_QUEUE_NAME, async (job: Job<RefundJobData>) => {
    const { refundId } = job.data;
    console.log(`[RefundWorker] Processing refund: ${refundId}`);

    try {
        // 1. Fetch Refund & Associated Payment
        // We join to get payment details for verification
        const result = await query(
            `SELECT r.*, p.status as payment_status, p.amount as payment_total 
             FROM refunds r
             JOIN payments p ON r.payment_id = p.id
             WHERE r.id = $1`,
            [refundId]
        );

        if (result.rows.length === 0) {
            console.error(`[RefundWorker] Refund not found: ${refundId}`);
            return;
        }

        const refund = result.rows[0];

        // 2. Verify Payment is in refundable state
        if (refund.payment_status !== 'success') {
            const error = 'Payment status is not success';
            console.error(`[RefundWorker] ${error}`);
            await query("UPDATE refunds SET status = 'failed', reason = $1 WHERE id = $2", [error, refundId]);
            return;
        }

        // Verify total refunded amount (sum of all *other* processed refunds + this one?)
        // The requirement says: "Verify total refunded amount (sum of all refunds for this payment) does not exceed payment amount"
        // Usually, we check the SUM of (processed + current request).
        // Let's check what has been processed SO FAR.
        const sumResult = await query(
            "SELECT COALESCE(SUM(amount), 0) as total_refunded FROM refunds WHERE payment_id = $1 AND status = 'processed'",
            [refund.payment_id]
        );
        const alreadyRefunded = parseInt(sumResult.rows[0].total_refunded, 10);
        const currentRefundAmount = refund.amount;

        if (alreadyRefunded + currentRefundAmount > refund.payment_total) {
            const error = 'Refund amount exceeds remaining payment balance';
            console.error(`[RefundWorker] ${error}`);
            await query("UPDATE refunds SET status = 'failed', reason = $1 WHERE id = $2", [error, refundId]);
            return;
        }

        // 3. Simulate Processing Delay (3-5 seconds)
        const isTestMode = process.env.TEST_MODE === 'true';
        let delay = Math.floor(Math.random() * 2000) + 3000; // 3-5 seconds

        if (isTestMode && process.env.TEST_PROCESSING_DELAY) {
            delay = parseInt(process.env.TEST_PROCESSING_DELAY, 10);
        }

        console.log(`[RefundWorker] Simulating delay of ${delay}ms`);
        await sleep(delay);

        // 4. Update Refund Status in Database
        await query(
            "UPDATE refunds SET status = 'processed', processed_at = NOW() WHERE id = $1",
            [refundId]
        );

        // 5. Full Refund Check (Optional)
        // If (alreadyRefunded + current) == total, maybe mark payment as fully_refunded?
        // Requirement says "Optionally update payment record to reflect full refund status".
        // Use standard Payment status? Maybe "refunded"? 
        // Let's stick to the core requirements first, but this is a nice to have.

        // 6. Enqueue Webhook
        console.log(`[RefundWorker] Refund processed. Enqueueing webhook.`);

        await webhookQueue.add('deliver-webhook', {
            merchantId: refund.merchant_id,
            event: 'refund.processed',
            payload: {
                event: 'refund.processed',
                timestamp: Math.floor(Date.now() / 1000),
                data: {
                    refund: {
                        id: refund.id,
                        payment_id: refund.payment_id,
                        amount: refund.amount,
                        status: 'processed',
                        reason: refund.reason,
                        created_at: refund.created_at,
                        processed_at: new Date()
                    }
                }
            }
        });

    } catch (error) {
        console.error(`[RefundWorker] Error processing refund ${refundId}:`, error);
        throw error;
    }
}, { connection: connection as any });
