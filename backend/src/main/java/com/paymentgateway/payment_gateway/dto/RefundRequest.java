package com.paymentgateway.payment_gateway.dto;

import lombok.Data;

@Data
public class RefundRequest {
    private Integer amount; // Amount in smallest currency unit (e.g., paise)
    private String reason;
}
