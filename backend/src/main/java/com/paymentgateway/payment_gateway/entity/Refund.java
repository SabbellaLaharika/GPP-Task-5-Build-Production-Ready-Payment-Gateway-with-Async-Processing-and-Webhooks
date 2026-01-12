package com.paymentgateway.payment_gateway.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "refunds", indexes = {
    @Index(name = "idx_refunds_payment_id", columnList = "payment_id")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Refund {
    
    @Id
    @Column(length = 64)
    private String id;  // Format: "rfnd_" + 16 alphanumeric characters
    
    @Column(name = "payment_id", length = 64, nullable = false)
    private String paymentId;  // Foreign key to payments(id)
    
    @Column(name = "merchant_id", nullable = false)
    private UUID merchantId;  // Foreign key to merchants(id)
    
    @Column(nullable = false)
    private Integer amount;  // Refund amount in smallest currency unit (paise)
    
    @Column(length = 1000)
    private String reason;  // Refund reason/description (optional)
    
    @Column(length = 20, nullable = false)
    private String status = "pending";  // Values: 'pending', 'processed'
    
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
    
    @Column(name = "processed_at")
    private LocalDateTime processedAt;  // Set when status changes to 'processed'
    
    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        if (id == null) {
            id = generateRefundId();
        }
    }
    
    private String generateRefundId() {
        // Generate: rfnd_ + 16 random alphanumeric characters
        String chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        StringBuilder sb = new StringBuilder("rfnd_");
        for (int i = 0; i < 16; i++) {
            int index = (int) (Math.random() * chars.length());
            sb.append(chars.charAt(index));
        }
        return sb.toString();
    }
}