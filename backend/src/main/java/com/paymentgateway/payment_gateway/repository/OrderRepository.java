package com.paymentgateway.payment_gateway.repository;

import com.paymentgateway.payment_gateway.entity.Order;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface OrderRepository extends JpaRepository<Order, String> {
    List<Order> findByMerchantId(String merchantId);
}