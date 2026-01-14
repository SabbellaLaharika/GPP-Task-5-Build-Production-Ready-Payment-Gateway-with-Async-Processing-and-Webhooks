package com.paymentgateway.payment_gateway.workers;

import com.paymentgateway.payment_gateway.entity.Order;
import com.paymentgateway.payment_gateway.entity.Payment;
import com.paymentgateway.payment_gateway.jobs.ProcessPaymentJob;
import com.paymentgateway.payment_gateway.repository.OrderRepository;
import com.paymentgateway.payment_gateway.repository.PaymentRepository;
import com.paymentgateway.payment_gateway.queue.JobQueue;
import com.paymentgateway.payment_gateway.service.WebhookService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.Random;
import java.util.UUID;

@Component
public class PaymentWorker {
    
    private static final Logger log = LoggerFactory.getLogger(PaymentWorker.class);
    
    @Autowired
    private JobQueue jobQueue;
    
    @Autowired
    private PaymentRepository paymentRepository;
    
    @Autowired
    private OrderRepository orderRepository;
    
    @Autowired
    private WebhookService webhookService;
    
    @Value("${TEST_MODE:false}")
    private boolean testMode;
    
    @Value("${TEST_PROCESSING_DELAY:1000}")
    private long testProcessingDelay;
    
    @Value("${TEST_PAYMENT_SUCCESS:true}")
    private boolean testPaymentSuccess;
    
    private final Random random = new Random();
    
    public void processPayments() {
        log.info("PaymentWorker started");
        
        while (true) {
            try {
                ProcessPaymentJob job = jobQueue.dequeuePaymentJob(5);
                
                if (job != null) {
                    log.info("Processing payment job: {}", job.getPaymentId());
                    processPayment(job);
                }
                
            } catch (Exception e) {
                log.error("Error in PaymentWorker", e);
                try {
                    Thread.sleep(1000);
                } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                    break;
                }
            }
        }
        
        log.info("PaymentWorker stopped");
    }
    
    private void processPayment(ProcessPaymentJob job) {
        try {
            Optional<Payment> paymentOpt = paymentRepository.findById(job.getPaymentId());
            
            if (paymentOpt.isEmpty()) {
                log.error("Payment not found: {}", job.getPaymentId());
                jobQueue.markJobFailed(JobQueue.getPaymentQueue());
                return;
            }
            
            Payment payment = paymentOpt.get();
            
            long delayMs = calculateProcessingDelay();
            log.info("Simulating payment processing delay: {}ms", delayMs);
            Thread.sleep(delayMs);
            
            boolean success = determinePaymentOutcome(payment.getMethod());
            
            if (success) {
                payment.setStatus("success");
                log.info("Payment succeeded: {}", payment.getId());
            } else {
                payment.setStatus("failed");
                payment.setErrorCode("PAYMENT_DECLINED");
                payment.setErrorDescription("Payment was declined by the payment processor");
                log.info("Payment failed: {}", payment.getId());
            }
            
            payment.setUpdatedAt(LocalDateTime.now());
            paymentRepository.save(payment);
            
            updateOrderStatus(payment);
            
            sendPaymentWebhook(payment);
            
            jobQueue.markJobCompleted(JobQueue.getPaymentQueue());
            
            log.info("Payment processing completed: {}", payment.getId());
            
        } catch (Exception e) {
            log.error("Failed to process payment: {}", job.getPaymentId(), e);
            jobQueue.markJobFailed(JobQueue.getPaymentQueue());
        }
    }
    
    private long calculateProcessingDelay() {
        if (testMode) {
            return testProcessingDelay;
        } else {
            return 5000 + random.nextInt(5000);
        }
    }
    
    private boolean determinePaymentOutcome(String method) {
        if (testMode) {
            return testPaymentSuccess;
        }
        
        int randomValue = random.nextInt(100);
        
        if ("upi".equalsIgnoreCase(method)) {
            return randomValue < 90;
        } else if ("card".equalsIgnoreCase(method)) {
            return randomValue < 95;
        }
        
        return true;
    }
    
    private void updateOrderStatus(Payment payment) {
        Optional<Order> orderOpt = orderRepository.findById(payment.getOrder().getId());
        
        if (orderOpt.isPresent()) {
            Order order = orderOpt.get();
            
            if ("success".equals(payment.getStatus())) {
                order.setStatus("paid");
            } else {
                order.setStatus("failed");
            }
            
            order.setUpdatedAt(LocalDateTime.now());
            orderRepository.save(order);
            
            log.info("Updated order status: {} -> {}", order.getId(), order.getStatus());
        }
    }
    
    private void sendPaymentWebhook(Payment payment) {
        try {
            String event = "success".equals(payment.getStatus()) ? "payment.success" : "payment.failed";
            
            Map<String, Object> paymentData = new HashMap<>();
            paymentData.put("id", payment.getId());
            paymentData.put("order_id", payment.getOrder().getId());
            paymentData.put("amount", payment.getAmount());
            paymentData.put("currency", payment.getCurrency());
            paymentData.put("method", payment.getMethod());
            paymentData.put("status", payment.getStatus());
            paymentData.put("created_at", payment.getCreatedAt().toString());
            
            if (payment.getVpa() != null) {
                paymentData.put("vpa", payment.getVpa());
            }
            if (payment.getCardNetwork() != null) {
                paymentData.put("card_network", payment.getCardNetwork());
                paymentData.put("card_last4", payment.getCardLast4());
            }
            
            webhookService.sendPaymentWebhook(UUID.fromString(payment.getMerchant().getId()), event, paymentData);
            
        } catch (Exception e) {
            log.error("Failed to send payment webhook", e);
        }
    }
}