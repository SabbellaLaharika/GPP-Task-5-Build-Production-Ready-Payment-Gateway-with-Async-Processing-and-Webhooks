package com.paymentgateway.payment_gateway.repository;

import com.paymentgateway.payment_gateway.entity.WebhookLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface WebhookLogRepository extends JpaRepository<WebhookLog, UUID> {
    
    Page<WebhookLog> findAll(Pageable pageable);

    List<WebhookLog> findByMerchantId(UUID merchantId);
    
    List<WebhookLog> findByStatus(String status);
    
    List<WebhookLog> findByStatusAndNextRetryAtBefore(String status, LocalDateTime time);
    
    long countByStatus(String status);
}