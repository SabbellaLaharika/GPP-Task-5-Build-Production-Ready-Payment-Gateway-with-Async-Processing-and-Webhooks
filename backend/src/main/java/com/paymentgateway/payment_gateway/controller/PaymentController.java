package com.paymentgateway.payment_gateway.controller;

import com.paymentgateway.payment_gateway.dto.ErrorResponse;
import com.paymentgateway.payment_gateway.dto.PaymentRequest;
import com.paymentgateway.payment_gateway.entity.Merchant;
import com.paymentgateway.payment_gateway.entity.Order;
import com.paymentgateway.payment_gateway.entity.Payment;
import com.paymentgateway.payment_gateway.service.MerchantService;
import com.paymentgateway.payment_gateway.service.OrderService;
import com.paymentgateway.payment_gateway.service.PaymentService;
import com.paymentgateway.payment_gateway.util.PaymentValidator;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;
import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping("/api/v1/payments")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;
    private final OrderService orderService;
    private final MerchantService merchantService;
    
    // Create Payment Endpoint
    @PostMapping
    public ResponseEntity<?> createPayment(
            @RequestHeader("X-Api-Key") String apiKey,
            @RequestHeader("X-Api-Secret") String apiSecret,
            @RequestBody PaymentRequest request) {
        
        try {
            // Validate API credentials
            Optional<Merchant> merchantOpt = merchantService.findByApiKey(apiKey);
            if (merchantOpt.isEmpty() || !merchantOpt.get().getApiSecret().equals(apiSecret)) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(new ErrorResponse("AUTHENTICATION_ERROR", "Invalid API credentials"));
            }

            Merchant merchant = merchantOpt.get();

            // Validate order exists
            Optional<Order> orderOpt = orderService.findById(request.getOrderId());
            if (orderOpt.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(new ErrorResponse("NOT_FOUND_ERROR", "Order not found"));
            }

            Order order = orderOpt.get();

            // Verify order belongs to merchant
            if (!order.getMerchant().getId().equals(merchant.getId())) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(new ErrorResponse("BAD_REQUEST_ERROR", "Order does not belong to merchant"));
            }

            // Check if payment already exists for this order
            List<Payment> existingPayments = paymentService.findByOrderId(order.getId());
            if (!existingPayments.isEmpty()) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(new ErrorResponse("PAYMENT_ALREADY_EXISTS", "Payment already exists for this order"));
            }
            // Validate payment method
            String method = request.getMethod();
            if (!"upi".equals(method) && !"card".equals(method)) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(new ErrorResponse("BAD_REQUEST_ERROR", "Invalid payment method"));
            }

            // Validate method-specific fields
            String vpa = null;
            String cardNetwork = null;
            String cardLast4 = null;

            if ("upi".equals(method)) {
                // Validate VPA
                vpa = request.getVpa();
                if (!PaymentValidator.isValidVPA(vpa)) {
                    return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                            .body(new ErrorResponse("INVALID_VPA", "Invalid VPA format"));
                }
            } else if ("card".equals(method)) {
                // Validate card number
                String cardNumber = request.getCardNumber();
                if (!PaymentValidator.isValidCardNumber(cardNumber)) {
                    return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                            .body(new ErrorResponse("INVALID_CARD", "Invalid card number"));
                }

                // Detect card network
                cardNetwork = PaymentValidator.detectCardNetwork(cardNumber);

                // Validate expiry
                if (!PaymentValidator.isValidExpiry(request.getExpiryMonth(), request.getExpiryYear())) {
                    return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                            .body(new ErrorResponse("EXPIRED_CARD", "Card has expired or invalid expiry date"));
                }

                // Validate CVV
                if (!PaymentValidator.isValidCVV(request.getCvv(), cardNetwork)) {
                    return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                            .body(new ErrorResponse("INVALID_CARD", "Invalid CVV"));
                }

                // Store only last 4 digits
                cardLast4 = PaymentValidator.getCardLast4(cardNumber);
            }

            // Create payment
            Payment payment = paymentService.createPayment(
                    order, merchant, method, vpa, cardNetwork, cardLast4
            );

            // Process payment asynchronously
            CompletableFuture.runAsync(() -> paymentService.processPayment(payment));

            // Build response
            Map<String, Object> response = new HashMap<>();
            response.put("id", payment.getId());
            response.put("order_id", order.getId());
            response.put("merchant_id", merchant.getId());
            response.put("amount", payment.getAmount());
            response.put("currency", payment.getCurrency());
            response.put("method", payment.getMethod());
            response.put("status", payment.getStatus());
            
            if ("upi".equals(method)) {
                response.put("vpa", payment.getVpa());
            } else if ("card".equals(method)) {
                response.put("card_network", payment.getCardNetwork());
                response.put("card_last4", payment.getCardLast4());
            }
            
            response.put("created_at", payment.getCreatedAt().toString());
            response.put("updated_at", payment.getUpdatedAt().toString());

            return ResponseEntity.status(HttpStatus.CREATED).body(response);

        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(new ErrorResponse("BAD_REQUEST_ERROR", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponse("INTERNAL_ERROR", "An unexpected error occurred"));
        }
    }

    // Get Payment Endpoint
    @GetMapping("/{paymentId}")
    public ResponseEntity<?> getPayment(
            @RequestHeader("X-Api-Key") String apiKey,
            @RequestHeader("X-Api-Secret") String apiSecret,
            @PathVariable String paymentId) {
        
        try {
            // Validate API credentials
            Optional<Merchant> merchantOpt = merchantService.findByApiKey(apiKey);
            if (merchantOpt.isEmpty() || !merchantOpt.get().getApiSecret().equals(apiSecret)) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(new ErrorResponse("AUTHENTICATION_ERROR", "Invalid API credentials"));
            }

            Merchant merchant = merchantOpt.get();

            // Find payment
            Optional<Payment> paymentOpt = paymentService.findById(paymentId);
            if (paymentOpt.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(new ErrorResponse("NOT_FOUND_ERROR", "Payment not found"));
            }

            Payment payment = paymentOpt.get();

            // Verify payment belongs to merchant
            if (!payment.getMerchant().getId().equals(merchant.getId())) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(new ErrorResponse("NOT_FOUND_ERROR", "Payment not found"));
            }

            // Build response
            Map<String, Object> response = new HashMap<>();
            response.put("id", payment.getId());
            response.put("order_id", payment.getOrder().getId());
            response.put("merchant_id", merchant.getId());
            response.put("amount", payment.getAmount());
            response.put("currency", payment.getCurrency());
            response.put("method", payment.getMethod());
            response.put("status", payment.getStatus());
            
            if ("upi".equals(payment.getMethod())) {
                response.put("vpa", payment.getVpa());
            } else if ("card".equals(payment.getMethod())) {
                response.put("card_network", payment.getCardNetwork());
                response.put("card_last4", payment.getCardLast4());
            }
            
            if (payment.getErrorCode() != null) {
                response.put("error_code", payment.getErrorCode());
                response.put("error_description", payment.getErrorDescription());
            }
            
            response.put("created_at", payment.getCreatedAt().toString());
            response.put("updated_at", payment.getUpdatedAt().toString());

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponse("INTERNAL_ERROR", "An unexpected error occurred"));
        }
    }
    // List All Payments Endpoint (for dashboard)
    @GetMapping
    public ResponseEntity<?> listPayments(
            @RequestHeader("X-Api-Key") String apiKey,
            @RequestHeader("X-Api-Secret") String apiSecret) {
        
        try {
            // Validate API credentials
            Optional<Merchant> merchantOpt = merchantService.findByApiKey(apiKey);
            if (merchantOpt.isEmpty() || !merchantOpt.get().getApiSecret().equals(apiSecret)) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(new ErrorResponse("AUTHENTICATION_ERROR", "Invalid API credentials"));
            }

            Merchant merchant = merchantOpt.get();

            // Get all payments for this merchant
            List<Payment> payments = paymentService.findByMerchantId(merchant.getId());

            // Build response list
            List<Map<String, Object>> responseList = new ArrayList<>();
            
            for (Payment payment : payments) {
                Map<String, Object> paymentData = new HashMap<>();
                paymentData.put("id", payment.getId());
                paymentData.put("order_id", payment.getOrder().getId());
                paymentData.put("merchant_id", merchant.getId());
                paymentData.put("amount", payment.getAmount());
                paymentData.put("currency", payment.getCurrency());
                paymentData.put("method", payment.getMethod());
                paymentData.put("status", payment.getStatus());
                
                if ("upi".equals(payment.getMethod())) {
                    paymentData.put("vpa", payment.getVpa());
                } else if ("card".equals(payment.getMethod())) {
                    paymentData.put("card_network", payment.getCardNetwork());
                    paymentData.put("card_last4", payment.getCardLast4());
                }
                
                if (payment.getErrorCode() != null) {
                    paymentData.put("error_code", payment.getErrorCode());
                    paymentData.put("error_description", payment.getErrorDescription());
                }
                
                paymentData.put("created_at", payment.getCreatedAt().toString());
                paymentData.put("updated_at", payment.getUpdatedAt().toString());
                
                responseList.add(paymentData);
            }

            return ResponseEntity.ok(responseList);

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponse("INTERNAL_ERROR", "An unexpected error occurred"));
        }
    }
}