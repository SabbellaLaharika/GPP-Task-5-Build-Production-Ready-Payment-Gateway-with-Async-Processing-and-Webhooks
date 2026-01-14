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
    
    public void processRefunds() {
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
            
            if (paymentOpt.isEmpty() || !"success".equals(paymentOpt.get().getStatus())) {
                log.error("Payment not refundable: {}", refund.getPaymentId());
                refund.setStatus("processed");
                refund.setProcessedAt(LocalDateTime.now());
                refundRepository.save(refund);
                jobQueue.markJobFailed(JobQueue.getRefundQueue());
                return;
            }
            
            Payment payment = paymentOpt.get();
            
            long delayMs = 3000 + random.nextInt(2000);
            log.info("Simulating refund processing delay: {}ms", delayMs);
            Thread.sleep(delayMs);
            
            refund.setStatus("processed");
            refund.setProcessedAt(LocalDateTime.now());
            refundRepository.save(refund);
            
            log.info("Refund processed: {}", refund.getId());
            
            if (refund.getAmount().equals(payment.getAmount())) {
                log.info("Full refund detected for payment: {}", payment.getId());
            }
            
            sendRefundWebhook(refund, payment);
            
            jobQueue.markJobCompleted(JobQueue.getRefundQueue());
            
            log.info("Refund processing completed: {}", refund.getId());
            
        } catch (Exception e) {
            log.error("Failed to process refund: {}", job.getRefundId(), e);
            jobQueue.markJobFailed(JobQueue.getRefundQueue());
        }
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