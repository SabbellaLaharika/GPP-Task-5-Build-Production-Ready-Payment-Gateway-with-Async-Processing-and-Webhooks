package com.paymentgateway.payment_gateway.jobs;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DeliverWebhookJob implements Serializable {
    
    private static final long serialVersionUID = 1L;
    
    private UUID merchantId;
    private String eventType;
    private String payloadData;
    private Long createdAt;
    private Integer attempts = 0;
    
    public DeliverWebhookJob(UUID merchantId, String eventType, String payloadData) {
        this.merchantId = merchantId;
        this.eventType = eventType;
        this.payloadData = payloadData;
        this.createdAt = System.currentTimeMillis();
        this.attempts = 0;
    }
}