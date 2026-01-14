package com.paymentgateway.payment_gateway.jobs;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProcessRefundJob implements Serializable {
    
    private static final long serialVersionUID = 1L;
    
    private String refundId;
    private Long createdAt;
    private Integer attempts = 0;
    
    public ProcessRefundJob(String refundId) {
        this.refundId = refundId;
        this.createdAt = System.currentTimeMillis();
        this.attempts = 0;
    }
}