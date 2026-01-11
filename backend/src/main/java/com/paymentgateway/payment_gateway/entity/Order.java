package com.paymentgateway.payment_gateway.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "orders", indexes = {
    @Index(name = "idx_merchant_id", columnList = "merchant_id")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Order {

    @Id
    @Column(length = 64)
    private String id; // Format: order_XXX (18 alphanumeric)

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "merchant_id", nullable = false)
    private Merchant merchant;

    @Column(nullable = false)
    private Integer amount; // Stored in smallest currency unit (paise), minimum 100

    @Column(length = 3, nullable = false)
    private String currency = "INR";

    @Column(length = 255)
    private String receipt;

    @Column(columnDefinition = "TEXT")
    private String notes; // JSON object, optional

    @Column(name = "status", length = 20, nullable = false)
    private String status = "created"; // created, processing, paid, failed

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    public void generateOrderId() {
        if (this.id == null) {
            this.id = "order_" + generateAlphanumeric(15);
        }
    }

    private String generateAlphanumeric(int length) {
        String chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        StringBuilder result = new StringBuilder();
        for (int i = 0; i < length; i++) {
            result.append(chars.charAt((int) (Math.random() * chars.length())));
        }
        return result.toString();
    }
}