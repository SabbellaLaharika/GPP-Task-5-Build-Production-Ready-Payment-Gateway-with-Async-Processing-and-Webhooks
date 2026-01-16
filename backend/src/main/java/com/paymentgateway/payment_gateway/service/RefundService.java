package com.paymentgateway.payment_gateway.service;

import com.paymentgateway.payment_gateway.entity.Merchant;
import com.paymentgateway.payment_gateway.entity.Payment;
import com.paymentgateway.payment_gateway.entity.Refund;
import com.paymentgateway.payment_gateway.queue.JobQueue;
import com.paymentgateway.payment_gateway.repository.RefundRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
// import java.util.UUID; // Merchant ID is UUID in Refund entity? No, checked entity it is UUID in Refund but checking usage.
// Actually Refund entity uses UUID for merchantId. Payment uses Merchant entity.
// Let's check consistency.

@Service
@RequiredArgsConstructor
public class RefundService {

    private final RefundRepository refundRepository;
    private final PaymentService paymentService; // To look up payments
    private final JobQueue jobQueue;
    private final WebhookService webhookService;

    @Transactional
    public Refund createRefund(String paymentId, Integer amount, String reason, Merchant merchant) {
        // 1. Verify Payment belongs to merchant
        Payment payment = paymentService.findById(paymentId)
                .orElseThrow(() -> new IllegalArgumentException("Payment not found"));

        if (!payment.getMerchant().getId().equals(merchant.getId())) {
             throw new IllegalArgumentException("Payment does not belong to this merchant");
        }

        // 2. Verify Payment is successful
        if (!"success".equals(payment.getStatus())) {
            throw new IllegalArgumentException("Payment is not in 'success' state, cannot refund");
        }

        // 3. Calculate already refunded amount
        List<Refund> existingRefunds = refundRepository.findByPaymentId(paymentId);
        long totalRefunded = existingRefunds.stream()
                .filter(r -> "processed".equals(r.getStatus()) || "pending".equals(r.getStatus()))
                .mapToLong(Refund::getAmount)
                .sum();

        // 4. Validate amount
        if (amount <= 0) {
            throw new IllegalArgumentException("Refund amount must be greater than 0");
        }
        
        if (totalRefunded + amount > payment.getAmount()) {
            throw new IllegalArgumentException("Refund amount exceeds available amount");
        }

        // 5. Create Refund
        Refund refund = new Refund();
        refund.setPaymentId(paymentId);
        refund.setMerchantId(java.util.UUID.fromString(merchant.getId())); // Refund entity uses UUID
        refund.setAmount(amount);
        refund.setReason(reason);
        refund.setStatus("pending");
        
        // Save
        refund = refundRepository.save(refund);

        // Trigger refund.created webhook
        try {
            java.util.Map<String, Object> refundData = new java.util.HashMap<>();
            refundData.put("refund_id", refund.getId());
            refundData.put("payment_id", refund.getPaymentId());
            refundData.put("amount", refund.getAmount());
            refundData.put("reason", refund.getReason());
            refundData.put("status", refund.getStatus());
            refundData.put("created_at", java.time.LocalDateTime.now().toString());

            webhookService.sendRefundWebhook(refund.getMerchantId(), "refund.created", refundData);
        } catch (Exception e) {
            System.err.println("Failed to trigger refund.created webhook: " + e.getMessage());
        }

        // 6. Enqueue Job
        jobQueue.enqueueRefundJob(refund.getId());

        return refund;
    }

    public Refund getRefund(String refundId, Merchant merchant) {
        Refund refund = refundRepository.findById(refundId)
                .orElseThrow(() -> new IllegalArgumentException("Refund not found"));

        // Validate ownership
        if (!refund.getMerchantId().toString().equals(merchant.getId())) {
             throw new IllegalArgumentException("Refund not found"); // Hide for security
        }

        return refund;
    }
}
