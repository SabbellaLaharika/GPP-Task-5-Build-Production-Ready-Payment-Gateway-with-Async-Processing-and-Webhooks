package com.paymentgateway.payment_gateway.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "webhook_logs", indexes = {
    @Index(name = "idx_webhook_logs_merchant_id", columnList = "merchant_id"),
    @Index(name = "idx_webhook_logs_status", columnList = "status"),
    @Index(name = "idx_webhook_logs_next_retry_at", columnList = "next_retry_at")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
public class WebhookLog {
    
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;  // UUID format, primary key, auto-generated
    
    @Column(name = "merchant_id", nullable = false)
    private UUID merchantId;  // Foreign key to merchants(id)
    
    @Column(length = 50, nullable = false)
    private String event;  // Event type (e.g., "payment.success", "refund.processed")
    
    @Column(columnDefinition = "TEXT", nullable = false)
    private String payload;  // Event payload data (JSON object)
    
    @Column(length = 20, nullable = false)
    private String status = "pending";  // Values: 'pending', 'success', 'failed'
    
    @Column(nullable = false)
    private Integer attempts = 0;  // Number of delivery attempts made
    
    @Column(name = "last_attempt_at")
    private LocalDateTime lastAttemptAt;  // Timestamp of last delivery attempt
    
    @Column(name = "next_retry_at")
    private LocalDateTime nextRetryAt;  // Timestamp for next retry attempt (optional)
    
    @Column(name = "response_code")
    private Integer responseCode;  // HTTP response code from merchant's webhook endpoint
    
    @Column(columnDefinition = "TEXT")
    private String responseBody;  // Response body from merchant's webhook endpoint
    
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
    
    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }
}