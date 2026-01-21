import { Worker, Job } from 'bullmq';
import { connection, WEBHOOK_QUEUE_NAME, webhookQueue } from '../config/queue';
import { query } from '../config/db';
import crypto from 'crypto';

interface WebhookJobData {
    merchantId: string;
    event: string;
    payload: any;
    logId?: string; // To track the same log entry across retries if needed, or we might create new logs/update existing. 
    // The requirement says "Record attempt number (increment from previous attempts)". 
    // It implies we update the same log entry or track it. Let's assume we update the single log entry for the event.
    attemptNumber?: number;
}

const generateSignature = (payload: any, secret: string) => {
    // Requirement: Use JSON string representation of payload exactly as sent
    const data = JSON.stringify(payload);
    return crypto.createHmac('sha256', secret).update(data).digest('hex');
};

const getRetryDelay = (attempt: number): number => {
    const isTestMode = process.env.WEBHOOK_RETRY_INTERVALS_TEST === 'true';

    if (isTestMode) {
        // Test Intervals: 0s, 5s, 10s, 15s, 20s
        // Attempt 1 (Immediate) -> passed 0 delay
        // Attempt 2 (after fail) -> 5s
        // Attempt 3 -> 10s
        // Attempt 4 -> 15s
        // Attempt 5 -> 20s
        const delays = [0, 5000, 10000, 15000, 20000];
        return delays[attempt - 1] || 20000;
    } else {
        // Production: 1m, 5m, 30m, 2h
        // Attempt 2 -> 1 min
        // Attempt 3 -> 5 min
        // Attempt 4 -> 30 min
        // Attempt 5 -> 2 hours
        const delays = [0, 60000, 300000, 1800000, 7200000];
        return delays[attempt - 1] || 7200000;
    }
};

export const webhookWorker = new Worker(WEBHOOK_QUEUE_NAME, async (job: Job<WebhookJobData>) => {
    const { merchantId, event, payload } = job.data;
    let { logId, attemptNumber = 1 } = job.data;

    console.log(`[WebhookWorker] Processing ${event} for merchant ${merchantId} (Attempt ${attemptNumber})`);

    let responseCode: number | null = null;
    let responseBody: string | null = null;
    let status = 'pending';

    try {
        // 1. Fetch Merchant Webhook Config
        const merchantResult = await query('SELECT webhook_url, webhook_secret FROM merchants WHERE id = $1', [merchantId]);
        if (merchantResult.rows.length === 0) {
            console.error(`[WebhookWorker] Merchant not found: ${merchantId}`);
            return;
        }
        const { webhook_url, webhook_secret } = merchantResult.rows[0];

        // 2. Create/Update Webhook Log (MOVED UP)
        if (!logId) {
            // First attempt, create log
            const logResult = await query(
                `INSERT INTO webhook_logs (merchant_id, event, payload, status, attempts, created_at, updated_at) 
             VALUES ($1, $2, $3, 'pending', 1, NOW(), NOW()) 
             RETURNING id`,
                [merchantId, event, payload]
            );
            logId = logResult.rows[0].id;
        } else {
            // Retry attempt, update attempts count
            await query('UPDATE webhook_logs SET attempts = $1, updated_at = NOW() WHERE id = $2', [attemptNumber, logId]);
        }

        if (!webhook_url) {
            console.log(`[WebhookWorker] No webhook URL configured for merchant ${merchantId}`);
            await query(
                `UPDATE webhook_logs 
                 SET status = 'failed', response_code = 400, response_body = 'No webhook URL configured', last_attempt_at = NOW(), updated_at = NOW() 
                 WHERE id = $1`,
                [logId]
            );
            return;
        }

        // 3. Generate Signature
        const signature = generateSignature(payload, webhook_secret);

        // 4. Send Webhook
        console.log(`[WebhookWorker] Sending to ${webhook_url}`);

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000); // 5 seconds timeout

        try {
            const response = await fetch(webhook_url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Webhook-Signature': signature, // Requirement: X-Webhook-Signature
                    // 'X-GPP-Event': event // Not strictly requested in screenshot 2, but good practice. Screenshot only mentions X-Webhook-Signature and Content-Type.
                },
                body: JSON.stringify(payload),
                signal: controller.signal
            });
            clearTimeout(timeout);

            responseCode = response.status;
            responseBody = await response.text();

            if (response.ok) {
                status = 'success';
            } else {
                status = 'failed'; // Will trigger retry logic
            }
        } catch (e) {
            clearTimeout(timeout);
            const err = e as Error;
            responseBody = err.message;
            status = 'failed';
        }

        // 5. Update Log with result
        await query(
            `UPDATE webhook_logs 
         SET status = $1, response_code = $2, response_body = $3, last_attempt_at = NOW(), updated_at = NOW() 
         WHERE id = $4`,
            [status === 'success' ? 'success' : 'pending', responseCode, responseBody ? responseBody.substring(0, 1000) : null, logId]
        );

        if (status === 'failed') {
            if (attemptNumber < 5) {
                const nextAttempt = attemptNumber + 1;
                const delay = getRetryDelay(nextAttempt);
                const nextRetryAt = new Date(Date.now() + delay);

                console.log(`[WebhookWorker] Failed. Retrying in ${delay}ms (Attempt ${nextAttempt})`);

                // Update next_retry_at in DB
                await query('UPDATE webhook_logs SET next_retry_at = $1 WHERE id = $2', [nextRetryAt, logId]);

                // Re-enqueue job with delay
                await webhookQueue.add('deliver-webhook', {
                    merchantId,
                    event,
                    payload,
                    logId,
                    attemptNumber: nextAttempt
                }, { delay });
            } else {
                console.log(`[WebhookWorker] Max retries reached. Marking as permanently failed.`);
                await query("UPDATE webhook_logs SET status = 'failed', next_retry_at = NULL WHERE id = $1", [logId]);
            }
        } else {
            console.log(`[WebhookWorker] Success!`);
        }

    } catch (error) {
        console.error(`[WebhookWorker] Critical Error:`, error);
        throw error;
    }
}, { connection: connection as any });
