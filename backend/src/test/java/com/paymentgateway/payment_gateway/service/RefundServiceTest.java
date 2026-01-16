package com.paymentgateway.payment_gateway.service;

import com.paymentgateway.payment_gateway.entity.Merchant;
import com.paymentgateway.payment_gateway.entity.Payment;
import com.paymentgateway.payment_gateway.entity.Refund;
import com.paymentgateway.payment_gateway.queue.JobQueue;
import com.paymentgateway.payment_gateway.repository.RefundRepository;
import org.junit.jupiter.api.Test;
// import org.junit.jupiter.api.extension.ExtendWith;
// import org.mockito.InjectMocks;
// import org.mockito.Mock;
// import org.mockito.junit.jupiter.MockitoExtension;
import static org.mockito.Mockito.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;

public class RefundServiceTest {

    // Manual mocks
    private RefundRepository refundRepository = mock(RefundRepository.class);
    private PaymentService paymentService = mock(PaymentService.class);
    private JobQueue jobQueue = mock(JobQueue.class);
    private WebhookService webhookService = mock(WebhookService.class);
    
    // Manual injection
    private RefundService refundService = new RefundService(refundRepository, paymentService, jobQueue, webhookService);

    @Test
    public void testCreateRefund_Success() {
        String paymentId = "pay_123";
        String merchantId = UUID.randomUUID().toString();
        
        Merchant merchant = new Merchant();
        merchant.setId(merchantId);

        Payment payment = new Payment();
        payment.setId(paymentId);
        payment.setMerchant(merchant);
        payment.setStatus("success");
        payment.setAmount(1000);

        when(paymentService.findById(paymentId)).thenReturn(Optional.of(payment));
        when(refundRepository.findByPaymentId(paymentId)).thenReturn(new ArrayList<>());
        when(refundRepository.save(any(Refund.class))).thenAnswer(i -> {
            Refund r = (Refund) i.getArguments()[0];
            r.setId("rfnd_test");
            return r;
        });

        Refund result = refundService.createRefund(paymentId, 100, "reason", merchant);

        assertNotNull(result);
        assertEquals("pending", result.getStatus());
        assertEquals(100, result.getAmount());
        verify(jobQueue, times(1)).enqueueRefundJob("rfnd_test");
    }

    @Test
    public void testCreateRefund_ExceedsAmount() {
        String paymentId = "pay_123";
        String merchantId = UUID.randomUUID().toString();
        
        Merchant merchant = new Merchant();
        merchant.setId(merchantId);

        Payment payment = new Payment();
        payment.setId(paymentId);
        payment.setMerchant(merchant);
        payment.setStatus("success");
        payment.setAmount(100); // 100 available

        when(paymentService.findById(paymentId)).thenReturn(Optional.of(payment));
        
        // No prior refunds
        when(refundRepository.findByPaymentId(paymentId)).thenReturn(new ArrayList<>());

        assertThrows(IllegalArgumentException.class, () -> {
            refundService.createRefund(paymentId, 101, "reason", merchant);
        });
    }

    @Test
    public void testCreateRefund_InvalidStatus() {
        String paymentId = "pay_123";
        String merchantId = UUID.randomUUID().toString();
        
        Merchant merchant = new Merchant();
        merchant.setId(merchantId);

        Payment payment = new Payment();
        payment.setId(paymentId);
        payment.setMerchant(merchant);
        payment.setStatus("pending"); // Not success

        when(paymentService.findById(paymentId)).thenReturn(Optional.of(payment));

        assertThrows(IllegalArgumentException.class, () -> {
            refundService.createRefund(paymentId, 100, "reason", merchant);
        });
    }
}
