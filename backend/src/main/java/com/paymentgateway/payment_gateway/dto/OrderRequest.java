package com.paymentgateway.payment_gateway.dto;

import lombok.Data;

@Data
public class OrderRequest {
    private Integer amount;
    private String currency;
    private String receipt;
    private String notes;
}