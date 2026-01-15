package com.paymentgateway.payment_gateway.service;

import com.paymentgateway.payment_gateway.entity.Merchant;
import com.paymentgateway.payment_gateway.entity.Order;
import com.paymentgateway.payment_gateway.entity.Payment;
import com.paymentgateway.payment_gateway.repository.PaymentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private final OrderService orderService;

    @Transactional
    public Payment createPayment(Order order, Merchant merchant, String method, String vpa, 
                                 String cardNetwork, String cardLast4) {
        Payment payment = new Payment();
        payment.setOrder(order);
        payment.setMerchant(merchant);
        payment.setAmount(order.getAmount());
        payment.setCurrency(order.getCurrency());
        payment.setMethod(method);
        payment.setStatus("pending"); // Set to pending initially
        
        // Set method-specific fields
        if ("upi".equals(method)) {
            payment.setVpa(vpa);
        } else if ("card".equals(method)) {
            payment.setCardNetwork(cardNetwork);
            payment.setCardLast4(cardLast4);
        }

        return paymentRepository.save(payment);
    }

    @Transactional
    public Payment processPayment(Payment payment) {
        // Simulate payment processing with delay (5-10 seconds)
        try {
            Thread.sleep((long) (5000 + Math.random() * 5000));
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }

        // Check for test mode
        boolean isTestMode = checkTestMode();
        
        if (isTestMode) {
            // Deterministic behavior for testing
            boolean shouldSucceed = getTestModeSuccess();
            return finalizePayment(payment, shouldSucceed);
        } else {
            // Random success/failure for demo
            boolean success;
            if ("upi".equals(payment.getMethod())) {
                success = Math.random() < 0.90; // 90% success rate
            } else {
                success = Math.random() < 0.95; // 95% success rate for cards
            }
            return finalizePayment(payment, success);
        }
    }

    @Transactional
    public Payment finalizePayment(Payment payment, boolean success) {
        if (success) {
            payment.setStatus("success");
            orderService.updateOrderStatus(payment.getOrder().getId(), "paid");
            payment.setErrorCode(null);
            payment.setErrorDescription(null);
        } else {
            payment.setStatus("failed");
            orderService.updateOrderStatus(payment.getOrder().getId(), "failed");
            payment.setErrorCode("PAYMENT_FAILED");
            payment.setErrorDescription("Payment could not be processed");
        }
        
        return paymentRepository.save(payment);
    }

    @Transactional
    public Payment capturePayment(String paymentId, Integer amount) {
        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new IllegalArgumentException("Payment not found"));

        if (!"success".equals(payment.getStatus())) {
            throw new IllegalArgumentException("Payment is not in a successful state");
        }

        if (Boolean.TRUE.equals(payment.getCaptured())) {
            throw new IllegalArgumentException("Payment already captured");
        }
        
        if (amount == null || amount <= 0) {
             throw new IllegalArgumentException("Invalid capture amount");
        }

        payment.setCaptured(true);
        
        return paymentRepository.save(payment);
    }

    public Optional<Payment> findById(String paymentId) {
        return paymentRepository.findById(paymentId);
    }

    public List<Payment> findByOrderId(String orderId) {
        return paymentRepository.findByOrderId(orderId);
    }

    public List<Payment> findByMerchantId(String merchantId) {
        return paymentRepository.findByMerchantId(merchantId);
    }

    public List<Payment> findAll() {
        return paymentRepository.findAll();
    }

    // Test mode helpers (read from environment variables)
    private boolean checkTestMode() {
        String testMode = System.getenv("TEST_MODE");
        return "true".equalsIgnoreCase(testMode);
    }

    private boolean getTestModeSuccess() {
        String testPaymentSuccess = System.getenv("TEST_PAYMENT_SUCCESS");
        return "true".equalsIgnoreCase(testPaymentSuccess);
    }
}