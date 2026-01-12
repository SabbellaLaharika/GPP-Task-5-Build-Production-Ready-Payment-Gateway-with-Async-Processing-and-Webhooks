package com.paymentgateway.payment_gateway.repository;

import com.paymentgateway.payment_gateway.entity.IdempotencyKey;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface IdempotencyKeyRepository extends JpaRepository<IdempotencyKey, String> {
    
    Optional<IdempotencyKey> findByKeyAndMerchantId(String key, UUID merchantId);
    
    void deleteByExpiresAtBefore(LocalDateTime time);
}