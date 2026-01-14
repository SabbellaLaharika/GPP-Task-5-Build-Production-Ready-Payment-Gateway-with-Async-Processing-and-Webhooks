package com.paymentgateway.payment_gateway.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.paymentgateway.payment_gateway.entity.Merchant;
import com.paymentgateway.payment_gateway.entity.WebhookLog;
import com.paymentgateway.payment_gateway.jobs.DeliverWebhookJob;
import com.paymentgateway.payment_gateway.repository.MerchantRepository;
import com.paymentgateway.payment_gateway.repository.WebhookLogRepository;
import com.paymentgateway.payment_gateway.queue.JobQueue;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.*;

@Service
public class WebhookService {
    
    private static final Logger log = LoggerFactory.getLogger(WebhookService.class);
    
    @Autowired
    private MerchantRepository merchantRepository;
    
    @Autowired
    private WebhookLogRepository webhookLogRepository;
    
    @Autowired
    private JobQueue jobQueue;
    
    @Autowired
    private ObjectMapper objectMapper;
    
    @Value("${webhook.timeout.seconds:5}")
    private int webhookTimeoutSeconds;
    
    @Value("${WEBHOOK_RETRY_INTERVALS_TEST:false}")
    private boolean testMode;
    
    // Generate HMAC-SHA256 signature
    public String generateSignature(String payload, String secret) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            SecretKeySpec secretKey = new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
            mac.init(secretKey);
            
            byte[] hash = mac.doFinal(payload.getBytes(StandardCharsets.UTF_8));
            
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) {
                    hexString.append('0');
                }
                hexString.append(hex);
            }
            
            return hexString.toString();
        } catch (Exception e) {
            log.error("Failed to generate webhook signature", e);
            throw new RuntimeException("Failed to generate webhook signature", e);
        }
    }
    
    // Deliver webhook
    public WebhookLog deliverWebhook(DeliverWebhookJob job) {
        // Fix: Convert UUID to String for repository lookup if Merchant ID is String
        Optional<Merchant> merchantOpt = merchantRepository.findById(job.getMerchantId().toString());
        
        if (merchantOpt.isEmpty()) {
            log.error("Merchant not found: {}", job.getMerchantId());
            return createFailedWebhookLog(job, null, "Merchant not found");
        }
        
        Merchant merchant = merchantOpt.get();
        
        if (merchant.getWebhookUrl() == null || merchant.getWebhookUrl().trim().isEmpty()) {
            log.info("Webhook URL not configured for merchant: {}", merchant.getId());
            return null;
        }
        
        WebhookLog webhookLog = new WebhookLog();
        // Fix: Convert String to UUID for WebhookLog
        webhookLog.setMerchantId(UUID.fromString(merchant.getId()));
        webhookLog.setEvent(job.getEventType());
        webhookLog.setPayload(job.getPayloadData());
        webhookLog.setStatus("pending");
        webhookLog.setAttempts(job.getAttempts() + 1);
        webhookLog.setLastAttemptAt(LocalDateTime.now());
        webhookLog.setCreatedAt(LocalDateTime.now());
        
        try {
            String signature = generateSignature(job.getPayloadData(), merchant.getWebhookSecret());
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("X-Webhook-Signature", signature);
            
            HttpEntity<String> request = new HttpEntity<>(job.getPayloadData(), headers);
            
            SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
            requestFactory.setConnectTimeout(webhookTimeoutSeconds * 1000);
            requestFactory.setReadTimeout(webhookTimeoutSeconds * 1000);
            
            RestTemplate restTemplate = new RestTemplate(requestFactory);
            
            log.info("Sending webhook to: {}", merchant.getWebhookUrl());
            ResponseEntity<String> response = restTemplate.exchange(
                merchant.getWebhookUrl(),
                HttpMethod.POST,
                request,
                String.class
            );
            
            int statusCode = response.getStatusCode().value();
            webhookLog.setResponseCode(statusCode);
            webhookLog.setResponseBody(response.getBody());
            
            if (statusCode >= 200 && statusCode < 300) {
                webhookLog.setStatus("success");
                log.info("Webhook delivered successfully to merchant: {}", merchant.getId());
            } else {
                webhookLog.setStatus("failed");
                scheduleRetry(webhookLog, job);
                log.warn("Webhook delivery failed with status {}: {}", statusCode, merchant.getId());
            }
            
        } catch (Exception e) {
            webhookLog.setStatus("failed");
            webhookLog.setResponseBody("Error: " + e.getMessage());
            scheduleRetry(webhookLog, job);
            log.error("Webhook delivery exception for merchant: {}", merchant.getId(), e);
        }
        
        return webhookLogRepository.save(webhookLog);
    }
    
    // Schedule retry
    private void scheduleRetry(WebhookLog webhookLog, DeliverWebhookJob job) {
        int attempts = webhookLog.getAttempts();
        
        if (attempts < 5) {
            long delaySeconds = calculateRetryDelay(attempts);
            
            LocalDateTime nextRetry = LocalDateTime.now().plusSeconds(delaySeconds);
            webhookLog.setNextRetryAt(nextRetry);
            webhookLog.setStatus("pending");
            
            log.info("Scheduling retry #{} for webhook in {} seconds", attempts + 1, delaySeconds);
            
            job.setAttempts(attempts);
            jobQueue.enqueueWebhookJob(job);
        } else {
            webhookLog.setStatus("failed");
            webhookLog.setNextRetryAt(null);
            log.warn("Webhook delivery failed permanently after {} attempts", attempts);
        }
    }
    
    // Calculate retry delay
    private long calculateRetryDelay(int attempt) {
        if (testMode) {
            // Test Mode: Attempt 2 (5s), Attempt 3 (10s), etc.
            // attempt is the number of attempts ALREADY made (1, 2, 3, 4)
            // If attempt=1 (failed), we want 5s delay for Attempt 2.
            return attempt * 5L; 
        } else {
            // Production Mode:
            // Attempt 1: Immediate (Initial)
            // Attempt 2: After 1 minute
            // Attempt 3: After 5 minutes
            // Attempt 4: After 30 minutes
            // Attempt 5: After 2 hours
            switch (attempt) {
                case 1: return 60L;      // After Attempt 1, wait 1m for Attempt 2
                case 2: return 300L;     // After Attempt 2, wait 5m for Attempt 3
                case 3: return 1800L;    // After Attempt 3, wait 30m for Attempt 4
                case 4: return 7200L;    // After Attempt 4, wait 2h for Attempt 5
                default: return 7200L;
            }
        }
    }
    
    // Create failed webhook log
    private WebhookLog createFailedWebhookLog(DeliverWebhookJob job, Integer responseCode, String errorMessage) {
        WebhookLog webhookLog = new WebhookLog();
        webhookLog.setMerchantId(job.getMerchantId());
        webhookLog.setEvent(job.getEventType());
        webhookLog.setPayload(job.getPayloadData());
        webhookLog.setStatus("failed");
        webhookLog.setAttempts(job.getAttempts() + 1);
        webhookLog.setLastAttemptAt(LocalDateTime.now());
        webhookLog.setResponseCode(responseCode);
        webhookLog.setResponseBody(errorMessage);
        webhookLog.setCreatedAt(LocalDateTime.now());
        
        return webhookLogRepository.save(webhookLog);
    }
    
    // Send payment webhook
    public void sendPaymentWebhook(UUID merchantId, String event, Map<String, Object> paymentData) {
        try {
            Map<String, Object> payload = new HashMap<>();
            payload.put("event", event);
            payload.put("timestamp", System.currentTimeMillis());
            payload.put("data", Map.of("payment", paymentData));
            
            String payloadJson = objectMapper.writeValueAsString(payload);
            
            DeliverWebhookJob job = new DeliverWebhookJob(merchantId, event, payloadJson);
            jobQueue.enqueueWebhookJob(job);
            
            log.info("Enqueued {} webhook for merchant: {}", event, merchantId);
        } catch (Exception e) {
            log.error("Failed to create payment webhook", e);
        }
    }
    
    // Send refund webhook
    public void sendRefundWebhook(UUID merchantId, String event, Map<String, Object> refundData) {
        try {
            Map<String, Object> payload = new HashMap<>();
            payload.put("event", event);
            payload.put("timestamp", System.currentTimeMillis());
            payload.put("data", Map.of("refund", refundData));
            
            String payloadJson = objectMapper.writeValueAsString(payload);
            
            DeliverWebhookJob job = new DeliverWebhookJob(merchantId, event, payloadJson);
            jobQueue.enqueueWebhookJob(job);
            
            log.info("Enqueued {} webhook for merchant: {}", event, merchantId);
        } catch (Exception e) {
            log.error("Failed to create refund webhook", e);
        }
    }
}