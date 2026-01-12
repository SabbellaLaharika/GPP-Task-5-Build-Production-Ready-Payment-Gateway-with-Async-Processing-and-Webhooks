package com.paymentgateway.payment_gateway.repository;

import com.paymentgateway.payment_gateway.entity.Refund;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface RefundRepository extends JpaRepository<Refund, String> {
    
    List<Refund> findByPaymentId(String paymentId);
    
    List<Refund> findByMerchantId(UUID merchantId);
    
    List<Refund> findByStatus(String status);
    
    boolean existsByPaymentId(String paymentId);
}