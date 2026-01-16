package com.paymentgateway.payment_gateway.controller;

import com.paymentgateway.payment_gateway.entity.Merchant;
import com.paymentgateway.payment_gateway.service.MerchantService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/test")
@RequiredArgsConstructor
public class TestController {

    private final MerchantService merchantService;
    private final com.paymentgateway.payment_gateway.queue.JobQueue jobQueue;

    @GetMapping("/jobs/status")
    public ResponseEntity<Map<String, Object>> getJobQueueStatus() {
        return ResponseEntity.ok(jobQueue.getQueueStats());
    }

    // Get test merchant details (no auth required)
    @GetMapping("/merchant")
    public ResponseEntity<?> getTestMerchant() {
        try {
            Merchant merchant = merchantService.findByEmail("test@example.com")
                    .orElseThrow(() -> new RuntimeException("Test merchant not found"));
            
            Map<String, Object> response = new HashMap<>();
            response.put("id", merchant.getId());
            response.put("name", merchant.getName());
            response.put("email", merchant.getEmail());
            response.put("api_key", merchant.getApiKey());
            response.put("api_secret", merchant.getApiSecret());
            response.put("webhook_url", merchant.getWebhookUrl());
            response.put("is_active", merchant.getIsActive());
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Test merchant not found");
            return ResponseEntity.status(404).body(error);
        }
    }
}