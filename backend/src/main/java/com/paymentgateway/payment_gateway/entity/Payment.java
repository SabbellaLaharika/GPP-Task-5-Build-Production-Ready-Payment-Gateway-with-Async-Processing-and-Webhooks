package com.paymentgateway.payment_gateway.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.util.UUID;
import java.time.LocalDateTime;

@Entity
@Table(name = "payments", indexes = {
    @Index(name = "idx_order_id", columnList = "order_id"),
    @Index(name = "idx_payment_status", columnList = "status")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Payment {

    @Id
    @Column(length = 64)
    private String id; // Format: pay_XXX (18 alphanumeric)

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false)
    private Order order;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "merchant_id", nullable = false)
    private Merchant merchant;

    @Column(nullable = false)
    private Integer amount;

    @Column(length = 3, nullable = false)
    private String currency = "INR";

    @Column(length = 20, nullable = false)
    private String method; // upi, card

    // UPI fields
    @Column(length = 255)
    private String vpa; // Virtual Payment Address (UPI ID)

    // Card fields
    @Column(name = "card_network", length = 20)
    private String cardNetwork; // visa, mastercard, amex, rupay, unknown

    @Column(name = "card_last4", length = 4)
    private String cardLast4;

    @Column(length = 20, nullable = false)
    private String status = "created"; // created, processing, success, failed

    @Column(name = "error_code", length = 50)
    private String errorCode;

    @Column(name = "error_description", columnDefinition = "TEXT")
    private String errorDescription;

    @Column
    private Boolean captured = false;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    public void generatePaymentId() {
        if (this.id == null) {
            this.id = "pay_" + generateAlphanumeric(15);
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

    // public UUID getMerchantId() {
    //     return merchant != null ? merchant.getId() : null;
    // }

    // public String getOrderId() {
    //     return order != null ? order.getId() : null;
    // }

}