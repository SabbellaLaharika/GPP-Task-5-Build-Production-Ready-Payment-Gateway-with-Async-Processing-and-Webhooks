package com.paymentgateway.payment_gateway.controller;

import com.paymentgateway.payment_gateway.dto.ErrorResponse;
import com.paymentgateway.payment_gateway.dto.OrderRequest;
import com.paymentgateway.payment_gateway.entity.Merchant;
import com.paymentgateway.payment_gateway.entity.Order;
import com.paymentgateway.payment_gateway.service.MerchantService;
import com.paymentgateway.payment_gateway.service.OrderService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/v1/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;
    private final MerchantService merchantService;

    // Create Order Endpoint
    @PostMapping
    public ResponseEntity<?> createOrder(
            @RequestHeader("X-Api-Key") String apiKey,
            @RequestHeader("X-Api-Secret") String apiSecret,
            @RequestBody OrderRequest request) {
        
        try {
            // Validate API credentials
            Optional<Merchant> merchantOpt = merchantService.findByApiKey(apiKey);
            if (merchantOpt.isEmpty() || !merchantOpt.get().getApiSecret().equals(apiSecret)) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(new ErrorResponse("AUTHENTICATION_ERROR", "Invalid API credentials"));
            }

            Merchant merchant = merchantOpt.get();

            // Validate request body
            if (request.getAmount() == null || request.getAmount() < 100) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(new ErrorResponse("BAD_REQUEST_ERROR", "Amount must be at least 100"));
            }

            // Create order
            Order order = orderService.createOrder(
                    merchant,
                    request.getAmount(),
                    request.getCurrency(),
                    request.getReceipt(),
                    request.getNotes()
            );

            // Build response
            Map<String, Object> response = new HashMap<>();
            response.put("id", order.getId());
            response.put("merchant_id", merchant.getId());
            response.put("amount", order.getAmount());
            response.put("currency", order.getCurrency());
            response.put("receipt", order.getReceipt());
            response.put("notes", order.getNotes());
            response.put("status", order.getStatus());
            response.put("created_at", order.getCreatedAt().toString());
            response.put("updated_at", order.getUpdatedAt().toString());

            return ResponseEntity.status(HttpStatus.CREATED).body(response);

        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(new ErrorResponse("BAD_REQUEST_ERROR", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponse("INTERNAL_ERROR", "An unexpected error occurred"));
        }
    }

    // Get Order Endpoint
    @GetMapping("/{orderId}")
    public ResponseEntity<?> getOrder(
            @RequestHeader("X-Api-Key") String apiKey,
            @RequestHeader("X-Api-Secret") String apiSecret,
            @PathVariable String orderId) {
        
        try {
            // Validate API credentials
            Optional<Merchant> merchantOpt = merchantService.findByApiKey(apiKey);
            if (merchantOpt.isEmpty() || !merchantOpt.get().getApiSecret().equals(apiSecret)) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(new ErrorResponse("AUTHENTICATION_ERROR", "Invalid API credentials"));
            }

            Merchant merchant = merchantOpt.get();

            // Find order
            Optional<Order> orderOpt = orderService.findById(orderId);
            if (orderOpt.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(new ErrorResponse("NOT_FOUND_ERROR", "Order not found"));
            }

            Order order = orderOpt.get();

            // Verify order belongs to merchant
            if (!order.getMerchant().getId().equals(merchant.getId())) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(new ErrorResponse("NOT_FOUND_ERROR", "Order not found"));
            }

            // Build response
            Map<String, Object> response = new HashMap<>();
            response.put("id", order.getId());
            response.put("merchant_id", merchant.getId());
            response.put("amount", order.getAmount());
            response.put("currency", order.getCurrency());
            response.put("receipt", order.getReceipt());
            response.put("notes", order.getNotes());
            response.put("status", order.getStatus());
            response.put("created_at", order.getCreatedAt().toString());
            response.put("updated_at", order.getUpdatedAt().toString());

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponse("INTERNAL_ERROR", "An unexpected error occurred"));
        }
    }
}