package com.paymentgateway.payment_gateway.service;

import com.paymentgateway.payment_gateway.entity.Merchant;
import com.paymentgateway.payment_gateway.entity.Order;
import com.paymentgateway.payment_gateway.entity.Payment;
import com.paymentgateway.payment_gateway.repository.PaymentRepository;
import org.junit.jupiter.api.Test;
// import org.junit.jupiter.api.extension.ExtendWith; // Removed
// import org.mockito.InjectMocks;
// import org.mockito.Mock;
// import org.mockito.junit.jupiter.MockitoExtension;
import static org.mockito.Mockito.mock; // Added

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

// @ExtendWith(MockitoExtension.class) // Removed
public class CreatePaymentTest {

    // Manual mocks
    private PaymentRepository paymentRepository = mock(PaymentRepository.class);
    private OrderService orderService = mock(OrderService.class);
    private WebhookService webhookService = mock(WebhookService.class);
    
    // Manual injection
    private PaymentService paymentService = new PaymentService(paymentRepository, orderService, webhookService);

    @Test
    public void testCreatePayment_UPI_Success() {
        Order order = new Order();
        order.setId("order_123");
        order.setAmount(100);
        order.setCurrency("INR");

        Merchant merchant = new Merchant();
        merchant.setId("mer_123");

        when(paymentRepository.save(any(Payment.class))).thenAnswer(i -> {
            Payment p = (Payment) i.getArguments()[0];
            p.setId("pay_test_generated");
            return p;
        });

        Payment result = paymentService.createPayment(
            order, merchant, "upi", "test@upi", null, null
        );

        assertNotNull(result);
        assertEquals("pending", result.getStatus());
        assertEquals("upi", result.getMethod());
        assertEquals(100, result.getAmount());
    }

    @Test
    public void testCreatePayment_Card_Success() {
        Order order = new Order();
        order.setId("order_456");
        order.setAmount(500);
        order.setCurrency("USD");

        Merchant merchant = new Merchant();
        merchant.setId("mer_456");

        when(paymentRepository.save(any(Payment.class))).thenAnswer(i -> {
            Payment p = (Payment) i.getArguments()[0];
            p.setId("pay_card_generated");
            return p;
        });

        Payment result = paymentService.createPayment(
            order, merchant, "card", null, "visa", "1234"
        );

        assertNotNull(result);
        assertEquals("pending", result.getStatus());
        assertEquals("card", result.getMethod());
        assertEquals("1234", result.getCardLast4()); 
    }
}
