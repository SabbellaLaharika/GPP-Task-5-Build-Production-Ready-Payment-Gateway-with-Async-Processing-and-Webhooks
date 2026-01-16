package com.paymentgateway.payment_gateway.service;

import com.paymentgateway.payment_gateway.entity.Payment;
import com.paymentgateway.payment_gateway.repository.PaymentRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
public class CapturePaymentTest {

    @Mock
    private PaymentRepository paymentRepository;

    @InjectMocks
    private PaymentService paymentService;

    @Test
    public void testCapturePayment_Success() {
        String paymentId = "pay_123";
        Payment payment = new Payment();
        payment.setId(paymentId);
        payment.setStatus("success");
        payment.setCaptured(false);

        when(paymentRepository.findById(paymentId)).thenReturn(Optional.of(payment));
        when(paymentRepository.save(any(Payment.class))).thenAnswer(i -> i.getArguments()[0]);

        Payment result = paymentService.capturePayment(paymentId, 100);

        assertTrue(result.getCaptured());
        assertEquals("success", result.getStatus());
    }

    @Test
    public void testCapturePayment_AlreadyCaptured() {
        String paymentId = "pay_123";
        Payment payment = new Payment();
        payment.setId(paymentId);
        payment.setStatus("success");
        payment.setCaptured(true); // Already captured

        when(paymentRepository.findById(paymentId)).thenReturn(Optional.of(payment));

        assertThrows(IllegalArgumentException.class, () -> {
            paymentService.capturePayment(paymentId, 100);
        });
    }

    @Test
    public void testCapturePayment_NotSuccess() {
        String paymentId = "pay_123";
        Payment payment = new Payment();
        payment.setId(paymentId);
        payment.setStatus("pending"); // Not success

        when(paymentRepository.findById(paymentId)).thenReturn(Optional.of(payment));

        assertThrows(IllegalArgumentException.class, () -> {
            paymentService.capturePayment(paymentId, 100);
        });
    }
}
