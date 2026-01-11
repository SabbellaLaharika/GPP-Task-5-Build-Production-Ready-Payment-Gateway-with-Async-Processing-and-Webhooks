package com.paymentgateway.payment_gateway.service;

import com.paymentgateway.payment_gateway.entity.Merchant;
import com.paymentgateway.payment_gateway.entity.Order;
import com.paymentgateway.payment_gateway.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class OrderService {

    private final OrderRepository orderRepository;
    private final MerchantService merchantService;

    @Transactional
    public Order createOrder(Merchant merchant, Integer amount, String currency, String receipt, String notes) {
        // Validate amount (minimum 100 paise = ₹1)
        if (amount < 100) {
            throw new IllegalArgumentException("Amount must be at least 100 paise");
        }

        Order order = new Order();
        order.setMerchant(merchant);
        order.setAmount(amount);
        order.setCurrency(currency != null ? currency : "INR");
        order.setReceipt(receipt);
        order.setNotes(notes);
        order.setStatus("created");

        return orderRepository.save(order);
    }

    public Optional<Order> findById(String orderId) {
        return orderRepository.findById(orderId);
    }

    public List<Order> findByMerchantId(String merchantId) {
        return orderRepository.findByMerchantId(merchantId);
    }

    @Transactional
    public Order updateOrderStatus(String orderId, String status) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Order not found"));
        
        order.setStatus(status);
        return orderRepository.save(order);
    }

    public List<Order> findAll() {
        return orderRepository.findAll();
    }
}