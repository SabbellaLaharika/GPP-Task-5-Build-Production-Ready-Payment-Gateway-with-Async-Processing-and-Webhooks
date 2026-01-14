package com.paymentgateway.payment_gateway.workers;

import com.paymentgateway.payment_gateway.jobs.DeliverWebhookJob;
import com.paymentgateway.payment_gateway.queue.JobQueue;
import com.paymentgateway.payment_gateway.service.WebhookService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

@Component
public class WebhookWorker {
    
    private static final Logger log = LoggerFactory.getLogger(WebhookWorker.class);
    
    @Autowired
    private JobQueue jobQueue;
    
    @Autowired
    private WebhookService webhookService;
    
    public void processWebhooks() {
        log.info("WebhookWorker started");
        
        while (true) {
            try {
                DeliverWebhookJob job = jobQueue.dequeueWebhookJob(5);
                
                if (job != null) {
                    log.info("Processing webhook job: {} for merchant {}", job.getEventType(), job.getMerchantId());
                    webhookService.deliverWebhook(job);
                    jobQueue.markJobCompleted(JobQueue.getWebhookQueue());
                }
                
            } catch (Exception e) {
                log.error("Error in WebhookWorker", e);
                jobQueue.markJobFailed(JobQueue.getWebhookQueue());
                try {
                    Thread.sleep(1000);
                } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                    break;
                }
            }
        }
        
        log.info("WebhookWorker stopped");
    }
}