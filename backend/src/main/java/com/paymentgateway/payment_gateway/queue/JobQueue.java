package com.paymentgateway.payment_gateway.queue;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.paymentgateway.payment_gateway.jobs.DeliverWebhookJob;
import com.paymentgateway.payment_gateway.jobs.ProcessPaymentJob;
import com.paymentgateway.payment_gateway.jobs.ProcessRefundJob;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.TimeUnit;

@Service
public class JobQueue {
    
    private static final Logger log = LoggerFactory.getLogger(JobQueue.class);
    
    private static final String PAYMENT_QUEUE = "queue:payments";
    private static final String WEBHOOK_QUEUE = "queue:webhooks";
    private static final String REFUND_QUEUE = "queue:refunds";
    
    private static final String STATS_PENDING = "stats:pending";
    private static final String STATS_PROCESSING = "stats:processing";
    private static final String STATS_COMPLETED = "stats:completed";
    private static final String STATS_FAILED = "stats:failed";
    private static final String WORKER_STATUS = "worker:status";
    
    @Autowired
    private RedisTemplate<String, Object> redisTemplate;
    
    @Autowired
    private ObjectMapper objectMapper;
    
    // Enqueue payment job
    public void enqueuePaymentJob(String paymentId) {
        try {
            ProcessPaymentJob job = new ProcessPaymentJob(paymentId);
            String jobJson = objectMapper.writeValueAsString(job);
            
            redisTemplate.opsForList().rightPush(PAYMENT_QUEUE, jobJson);
            redisTemplate.opsForHash().increment(STATS_PENDING, PAYMENT_QUEUE, 1);
            
            log.info("Enqueued payment job: {}", paymentId);
        } catch (Exception e) {
            log.error("Failed to enqueue payment job: {}", paymentId, e);
        }
    }
    
    // Enqueue webhook job
    public void enqueueWebhookJob(DeliverWebhookJob job) {
        try {
            String jobJson = objectMapper.writeValueAsString(job);
            
            redisTemplate.opsForList().rightPush(WEBHOOK_QUEUE, jobJson);
            redisTemplate.opsForHash().increment(STATS_PENDING, WEBHOOK_QUEUE, 1);
            
            log.info("Enqueued webhook job: {} for merchant {}", job.getEventType(), job.getMerchantId());
        } catch (Exception e) {
            log.error("Failed to enqueue webhook job", e);
        }
    }
    
    // Enqueue refund job
    public void enqueueRefundJob(String refundId) {
        try {
            ProcessRefundJob job = new ProcessRefundJob(refundId);
            String jobJson = objectMapper.writeValueAsString(job);
            
            redisTemplate.opsForList().rightPush(REFUND_QUEUE, jobJson);
            redisTemplate.opsForHash().increment(STATS_PENDING, REFUND_QUEUE, 1);
            
            log.info("Enqueued refund job: {}", refundId);
        } catch (Exception e) {
            log.error("Failed to enqueue refund job: {}", refundId, e);
        }
    }
    
    // Dequeue payment job
    public ProcessPaymentJob dequeuePaymentJob(long timeoutSeconds) {
        try {
            Object jobJson = redisTemplate.opsForList().leftPop(PAYMENT_QUEUE, timeoutSeconds, TimeUnit.SECONDS);
            
            if (jobJson != null) {
                redisTemplate.opsForHash().increment(STATS_PENDING, PAYMENT_QUEUE, -1);
                redisTemplate.opsForHash().increment(STATS_PROCESSING, PAYMENT_QUEUE, 1);
                
                return objectMapper.readValue(jobJson.toString(), ProcessPaymentJob.class);
            }
            
            return null;
        } catch (Exception e) {
            log.error("Failed to dequeue payment job", e);
            return null;
        }
    }
    
    // Dequeue webhook job
    public DeliverWebhookJob dequeueWebhookJob(long timeoutSeconds) {
        try {
            Object jobJson = redisTemplate.opsForList().leftPop(WEBHOOK_QUEUE, timeoutSeconds, TimeUnit.SECONDS);
            
            if (jobJson != null) {
                redisTemplate.opsForHash().increment(STATS_PENDING, WEBHOOK_QUEUE, -1);
                redisTemplate.opsForHash().increment(STATS_PROCESSING, WEBHOOK_QUEUE, 1);
                
                return objectMapper.readValue(jobJson.toString(), DeliverWebhookJob.class);
            }
            
            return null;
        } catch (Exception e) {
            log.error("Failed to dequeue webhook job", e);
            return null;
        }
    }
    
    // Dequeue refund job
    public ProcessRefundJob dequeueRefundJob(long timeoutSeconds) {
        try {
            Object jobJson = redisTemplate.opsForList().leftPop(REFUND_QUEUE, timeoutSeconds, TimeUnit.SECONDS);
            
            if (jobJson != null) {
                redisTemplate.opsForHash().increment(STATS_PENDING, REFUND_QUEUE, -1);
                redisTemplate.opsForHash().increment(STATS_PROCESSING, REFUND_QUEUE, 1);
                
                return objectMapper.readValue(jobJson.toString(), ProcessRefundJob.class);
            }
            
            return null;
        } catch (Exception e) {
            log.error("Failed to dequeue refund job", e);
            return null;
        }
    }
    
    // Mark job completed
    public void markJobCompleted(String queueName) {
        redisTemplate.opsForHash().increment(STATS_PROCESSING, queueName, -1);
        redisTemplate.opsForHash().increment(STATS_COMPLETED, queueName, 1);
    }
    
    // Mark job failed
    public void markJobFailed(String queueName) {
        redisTemplate.opsForHash().increment(STATS_PROCESSING, queueName, -1);
        redisTemplate.opsForHash().increment(STATS_FAILED, queueName, 1);
    }
    
    // Get queue stats
    public Map<String, Object> getQueueStats() {
        Map<String, Object> stats = new HashMap<>();
        
        stats.put("pending", getStat(STATS_PENDING, PAYMENT_QUEUE) + 
                            getStat(STATS_PENDING, WEBHOOK_QUEUE) + 
                            getStat(STATS_PENDING, REFUND_QUEUE));
        
        stats.put("processing", getStat(STATS_PROCESSING, PAYMENT_QUEUE) + 
                               getStat(STATS_PROCESSING, WEBHOOK_QUEUE) + 
                               getStat(STATS_PROCESSING, REFUND_QUEUE));
        
        stats.put("completed", getStat(STATS_COMPLETED, PAYMENT_QUEUE) + 
                              getStat(STATS_COMPLETED, WEBHOOK_QUEUE) + 
                              getStat(STATS_COMPLETED, REFUND_QUEUE));
        
        stats.put("failed", getStat(STATS_FAILED, PAYMENT_QUEUE) + 
                           getStat(STATS_FAILED, WEBHOOK_QUEUE) + 
                           getStat(STATS_FAILED, REFUND_QUEUE));
        
        String workerStatus = (String) redisTemplate.opsForValue().get(WORKER_STATUS);
        stats.put("worker_status", workerStatus != null ? workerStatus : "stopped");
        
        return stats;
    }
    
    private Long getStat(String statKey, String queueName) {
        Object value = redisTemplate.opsForHash().get(statKey, queueName);
        return value != null ? Long.parseLong(value.toString()) : 0L;
    }
    
    // Update worker status
    public void updateWorkerStatus(String status) {
        redisTemplate.opsForValue().set(WORKER_STATUS, status);
    }
    
    // Queue name getters
    public static String getPaymentQueue() {
        return PAYMENT_QUEUE;
    }
    
    public static String getWebhookQueue() {
        return WEBHOOK_QUEUE;
    }
    
    public static String getRefundQueue() {
        return REFUND_QUEUE;
    }
}