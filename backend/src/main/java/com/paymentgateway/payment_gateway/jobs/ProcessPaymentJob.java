package com.paymentgateway.payment_gateway.jobs;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProcessPaymentJob implements Serializable {
    
    private static final long serialVersionUID = 1L;
    
    private String paymentId;
    private Long createdAt;
    private Integer attempts = 0;
    
    public ProcessPaymentJob(String paymentId) {
        this.paymentId = paymentId;
        this.createdAt = System.currentTimeMillis();
        this.attempts = 0;
    }
}