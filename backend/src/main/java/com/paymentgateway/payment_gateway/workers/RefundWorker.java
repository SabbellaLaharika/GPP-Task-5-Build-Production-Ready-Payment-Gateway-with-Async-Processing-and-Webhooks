package com.paymentgateway.payment_gateway.workers;

import com.paymentgateway.payment_gateway.entity.Payment;
import com.paymentgateway.payment_gateway.entity.Refund;
import com.paymentgateway.payment_gateway.jobs.ProcessRefundJob;
import com.paymentgateway.payment_gateway.repository.PaymentRepository;
import com.paymentgateway.payment_gateway.repository.RefundRepository;
import com.paymentgateway.payment_gateway.queue.JobQueue;
import com.paymentgateway.payment_gateway.service.WebhookService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Random;
import java.util.UUID;

@Component
public class RefundWorker {
    
    private static final Logger log = LoggerFactory.getLogger(RefundWorker.class);
    
    @Autowired
    private JobQueue jobQueue;
    
    @Autowired
    private RefundRepository refundRepository;
    
    @Autowired
    private PaymentRepository paymentRepository;
    
    @Autowired
    private WebhookService webhookService;
    
    private final Random random = new Random();

    // @jakarta.annotation.PostConstruct removed to avoid double startup. 
    // WorkerApplication handles startup.
    
    public void processRefunds() {
        log.info("RefundWorker waiting for Redis to initialize...");
        try {
            // Wait for Redis to be fully ready
            Thread.sleep(10000); 
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return;
        }
        log.info("RefundWorker started");
        
        while (true) {
            try {
                ProcessRefundJob job = jobQueue.dequeueRefundJob(5);
                
                if (job != null) {
                    log.info("Processing refund job: {}", job.getRefundId());
                    processRefund(job);
                }
                
            } catch (Exception e) {
                log.error("Error in RefundWorker", e);
                try {
                    Thread.sleep(1000);
                } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                    break;
                }
            }
        }
        
        log.info("RefundWorker stopped");
    }
    
    private void processRefund(ProcessRefundJob job) {
        try {
            Optional<Refund> refundOpt = refundRepository.findById(job.getRefundId());
            
            if (refundOpt.isEmpty()) {
                log.error("Refund not found: {}", job.getRefundId());
                jobQueue.markJobFailed(JobQueue.getRefundQueue());
                return;
            }
            
            Refund refund = refundOpt.get();
            
            Optional<Payment> paymentOpt = paymentRepository.findById(refund.getPaymentId());
            
            if (paymentOpt.isEmpty()) {
                log.error("Payment not found for refund: {}", refund.getPaymentId());
                markRefundFailed(refund, "Payment not found");
                jobQueue.markJobFailed(JobQueue.getRefundQueue());
                return;
            }

            Payment payment = paymentOpt.get();

            // 1. Verify Payment Status
            if (!"success".equals(payment.getStatus())) {
                log.error("Payment not successful/refundable: {}", refund.getPaymentId());
                markRefundFailed(refund, "Payment is not in 'success' state");
                jobQueue.markJobFailed(JobQueue.getRefundQueue());
                return;
            }
            
            // 2. Verify Total Refunded Amount (Race Condition Check)
            List<Refund> allRefunds = refundRepository.findByPaymentId(payment.getId());
            long totalRefunded = allRefunds.stream()
                .filter(r -> "processed".equals(r.getStatus()) || 
                             ("pending".equals(r.getStatus()) && !r.getId().equals(refund.getId())))
                .mapToLong(Refund::getAmount)
                .sum();
                
            if (totalRefunded + refund.getAmount() > payment.getAmount()) {
                log.error("Refund amount exceeds available amount: {}", refund.getId());
                markRefundFailed(refund, "Refund amount exceeds available payment amount");
                jobQueue.markJobFailed(JobQueue.getRefundQueue());
                return;
            }
            
            // 3. Simulate processing delay (3-5 seconds)
            // random.nextInt(2001) gives 0 to 2000. 3000 + [0-2000] = 3000 to 5000ms.
            long delayMs = 3000 + random.nextInt(2001);
            log.info("Simulating refund processing delay: {}ms", delayMs);
            Thread.sleep(delayMs);
            
            // 4. Update Status
            refund.setStatus("processed");
            refund.setProcessedAt(LocalDateTime.now());
            refundRepository.save(refund);
            
            log.info("Refund processed: {}", refund.getId());
            
            if (refund.getAmount().equals(payment.getAmount())) {
                log.info("Full refund detected for payment: {}", payment.getId());
            }
            
            // 5. Send Webhook
            sendRefundWebhook(refund, payment);
            
            jobQueue.markJobCompleted(JobQueue.getRefundQueue());
            
            log.info("Refund processing completed: {}", refund.getId());
            
        } catch (Exception e) {
            log.error("Failed to process refund: {}", job.getRefundId(), e);
            jobQueue.markJobFailed(JobQueue.getRefundQueue());
        }
    }
    
    private void markRefundFailed(Refund refund, String reason) {
        // Since schema doesn't have explicit 'failed' status for refund (only pending/processed implied)
        // We might want to add 'failed' to allowed status or just log it.
        // Requirement says "Verify... invalid... return 400" (API).
        // For Worker: "Update refund status in database: Set status to 'processed'".
        // It doesn't explicitly say what to do if validation fails in WORKER (async).
        // But usually we should mark as failed. Schema comment says "Values: 'pending', 'processed'".
        // I will optimistically force 'failed' status or just leave it pending/stuck?
        // Let's assume 'failed' is a valid status we should add/use, or we just don't process it.
        // Given I can't easily change schema constraints if they exist (JPA doesn't enforce string enum), I'll set 'failed'.
        refund.setStatus("failed");
        // Append failure reason to the reason field or logic?
        if (refund.getReason() == null) {
             refund.setReason("Failed: " + reason);
        } else {
             refund.setReason(refund.getReason() + " | Failed: " + reason);
        }
        refundRepository.save(refund);
    }
    
    private void sendRefundWebhook(Refund refund, Payment payment) {
        try {
            Map<String, Object> refundData = new HashMap<>();
            refundData.put("id", refund.getId());
            refundData.put("payment_id", refund.getPaymentId());
            refundData.put("amount", refund.getAmount());
            refundData.put("reason", refund.getReason());
            refundData.put("status", refund.getStatus());
            refundData.put("created_at", refund.getCreatedAt().toString());
            refundData.put("processed_at", refund.getProcessedAt().toString());
            
            webhookService.sendRefundWebhook(UUID.fromString(payment.getMerchant().getId()), "refund.processed", refundData);
            
        } catch (Exception e) {
            log.error("Failed to send refund webhook", e);
        }
    }
}