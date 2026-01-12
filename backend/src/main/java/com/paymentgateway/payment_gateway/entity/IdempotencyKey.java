package com.paymentgateway.payment_gateway.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "idempotency_keys", indexes = {
    @Index(name = "idx_idempotency_keys_merchant", columnList = "merchant_id, key")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
public class IdempotencyKey {
    
    @Id
    @Column(length = 255)
    private String key;  // Idempotency key string (primary key, scoped with merchant_id)
    
    @Column(name = "merchant_id", nullable = false)
    private UUID merchantId;  // Foreign key to merchants(id)
    
    @Column(columnDefinition = "TEXT", nullable = false)
    private String response;  // Cached API response (JSON object)
    
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
    
    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;  // Set to created_at + 24 hours
    
    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        if (expiresAt == null) {
            expiresAt = createdAt.plusHours(24);
        }
    }
}