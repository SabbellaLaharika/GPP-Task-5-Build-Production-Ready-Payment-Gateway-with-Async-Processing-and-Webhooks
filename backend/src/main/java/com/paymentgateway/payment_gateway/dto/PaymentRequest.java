package com.paymentgateway.payment_gateway.dto;

import lombok.Data;

@Data
public class PaymentRequest {
    private String orderId;
    private String method; // "upi" or "card"
    
    // UPI fields
    private String vpa;
    
    // Card fields
    private String cardNumber;
    private String expiryMonth;
    private String expiryYear;
    private String cvv;
    private String holderName;
}