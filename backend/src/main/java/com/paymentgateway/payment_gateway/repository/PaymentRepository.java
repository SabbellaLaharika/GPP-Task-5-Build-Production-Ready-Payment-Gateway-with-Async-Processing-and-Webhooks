package com.paymentgateway.payment_gateway.repository;

import com.paymentgateway.payment_gateway.entity.Payment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PaymentRepository extends JpaRepository<Payment, String> {
    List<Payment> findByOrderId(String orderId);
    List<Payment> findByMerchantId(String merchantId);
    List<Payment> findByStatus(String status);
    boolean existsByOrderId(String orderId);
}