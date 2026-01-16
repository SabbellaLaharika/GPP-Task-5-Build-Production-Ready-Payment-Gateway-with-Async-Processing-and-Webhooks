package com.paymentgateway.payment_gateway.controller;

import com.paymentgateway.payment_gateway.dto.ErrorResponse;
import com.paymentgateway.payment_gateway.dto.RefundRequest;
import com.paymentgateway.payment_gateway.entity.Merchant;
import com.paymentgateway.payment_gateway.entity.Refund;
import com.paymentgateway.payment_gateway.service.MerchantService;
import com.paymentgateway.payment_gateway.service.RefundService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class RefundController {

    private final RefundService refundService;
    private final MerchantService merchantService;

    // Create Refund Endpoint
    @PostMapping("/payments/{paymentId}/refunds")
    public ResponseEntity<?> createRefund(
            @RequestHeader("X-Api-Key") String apiKey,
            @RequestHeader("X-Api-Secret") String apiSecret,
            @PathVariable String paymentId,
            @RequestBody RefundRequest request) {

        try {
            // Validate API credentials
            Optional<Merchant> merchantOpt = merchantService.findByApiKey(apiKey);
            if (merchantOpt.isEmpty() || !merchantOpt.get().getApiSecret().equals(apiSecret)) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(new ErrorResponse("AUTHENTICATION_ERROR", "Invalid API credentials"));
            }

            Merchant merchant = merchantOpt.get();

            Refund refund = refundService.createRefund(paymentId, request.getAmount(), request.getReason(), merchant);

            // Build response
            Map<String, Object> response = new HashMap<>();
            response.put("id", refund.getId());
            response.put("payment_id", refund.getPaymentId());
            response.put("amount", refund.getAmount());
            response.put("reason", refund.getReason());
            response.put("status", refund.getStatus());
            response.put("created_at", refund.getCreatedAt().toString());

            return ResponseEntity.status(HttpStatus.CREATED).body(response);

        } catch (IllegalArgumentException e) {
             return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(new ErrorResponse("BAD_REQUEST_ERROR", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponse("INTERNAL_ERROR", "An unexpected error occurred"));
        }
    }

    // Get Refund Endpoint
    @GetMapping("/refunds/{refundId}")
    public ResponseEntity<?> getRefund(
            @RequestHeader("X-Api-Key") String apiKey,
            @RequestHeader("X-Api-Secret") String apiSecret,
            @PathVariable String refundId) {

        try {
            // Validate API credentials
            Optional<Merchant> merchantOpt = merchantService.findByApiKey(apiKey);
            if (merchantOpt.isEmpty() || !merchantOpt.get().getApiSecret().equals(apiSecret)) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(new ErrorResponse("AUTHENTICATION_ERROR", "Invalid API credentials"));
            }

            Merchant merchant = merchantOpt.get();

            Refund refund = refundService.getRefund(refundId, merchant);

            // Build response
            Map<String, Object> response = new HashMap<>();
            response.put("id", refund.getId());
            response.put("payment_id", refund.getPaymentId());
            response.put("amount", refund.getAmount());
            response.put("reason", refund.getReason());
            response.put("status", refund.getStatus());
            response.put("created_at", refund.getCreatedAt().toString());
            if (refund.getProcessedAt() != null) {
                response.put("processed_at", refund.getProcessedAt().toString());
            }

            return ResponseEntity.ok(response);

        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(new ErrorResponse("NOT_FOUND_ERROR", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponse("INTERNAL_ERROR", "An unexpected error occurred"));
        }
    }
}
