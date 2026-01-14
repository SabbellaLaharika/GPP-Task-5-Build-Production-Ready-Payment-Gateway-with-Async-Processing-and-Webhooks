package com.paymentgateway.payment_gateway.jobs;

import com.paymentgateway.payment_gateway.entity.WebhookLog;
import com.paymentgateway.payment_gateway.queue.JobQueue;
import com.paymentgateway.payment_gateway.repository.WebhookLogRepository;

import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.UUID;

@Component
public class WebhookRetryJob {

    private static final int MAX_RETRIES =
            Integer.parseInt(System.getenv().getOrDefault("WEBHOOK_MAX_RETRIES", "5"));

    private final WebhookLogRepository webhookLogRepository;
    private final JobQueue jobQueue;

    public WebhookRetryJob(WebhookLogRepository webhookLogRepository,
                           JobQueue jobQueue) {
        this.webhookLogRepository = webhookLogRepository;
        this.jobQueue = jobQueue;
    }

    /**
     * Retry webhook delivery with exponential backoff
     */
    public void execute(String webhookLogId) {

        WebhookLog log = webhookLogRepository.findById(
                UUID.fromString(webhookLogId)
        ).orElseThrow(() -> new IllegalStateException("WebhookLog not found"));

        int attempts = log.getAttempts() + 1;
        log.setAttempts(attempts);
        log.setLastAttemptAt(LocalDateTime.now());

        if (attempts >= MAX_RETRIES) {
            log.setStatus("FAILED");
            webhookLogRepository.save(log);
            return;
        }

        // Exponential backoff: 2^attempt seconds
        int delaySeconds = (int) Math.pow(2, attempts);
        log.setNextRetryAt(LocalDateTime.now().plusSeconds(delaySeconds));
        webhookLogRepository.save(log);

        // Re-enqueue for delivery
        DeliverWebhookJob job = new DeliverWebhookJob(
                log.getMerchantId(),
                log.getEvent(),
                log.getPayload()
        );
        jobQueue.enqueueWebhookJob(job);
    }
}
