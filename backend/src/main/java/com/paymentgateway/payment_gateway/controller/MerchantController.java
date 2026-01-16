package com.paymentgateway.payment_gateway.controller;

import com.paymentgateway.payment_gateway.entity.Merchant;
import com.paymentgateway.payment_gateway.service.MerchantService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/v1/merchant")
@RequiredArgsConstructor
public class MerchantController {

    private final MerchantService merchantService;

    // Helper to validate API Key and get Merchant
    private Merchant validateMerchant(String apiKey) {
        return merchantService.findByApiKey(apiKey)
                .orElseThrow(() -> new RuntimeException("Invalid API Key"));
    }

    @GetMapping
    public ResponseEntity<?> getMerchantDetails(@RequestHeader("X-Api-Key") String apiKey) {
        try {
            Merchant merchant = validateMerchant(apiKey);
            
            return ResponseEntity.ok(Map.of(
                "id", merchant.getId(),
                "name", merchant.getName(),
                "email", merchant.getEmail(),
                "webhook_url", merchant.getWebhookUrl() != null ? merchant.getWebhookUrl() : "",
                "webhook_secret", merchant.getWebhookSecret() != null ? merchant.getWebhookSecret() : ""
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/webhook-config")
    public ResponseEntity<?> updateWebhookUrl(
            @RequestHeader("X-Api-Key") String apiKey,
            @RequestBody Map<String, String> payload) {
        try {
            Merchant merchant = validateMerchant(apiKey);
            String newUrl = payload.get("webhook_url");
            
            Merchant updated = merchantService.updateWebhookUrl(merchant.getId(), newUrl);
            
            return ResponseEntity.ok(Map.of(
                "message", "Webhook URL updated successfully",
                "webhook_url", updated.getWebhookUrl()
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/regenerate-secret")
    public ResponseEntity<?> regenerateWebhookSecret(@RequestHeader("X-Api-Key") String apiKey) {
        try {
            Merchant merchant = validateMerchant(apiKey);
            
            String newSecret = merchantService.regenerateWebhookSecret(merchant.getId());
            
            return ResponseEntity.ok(Map.of(
                "message", "Webhook secret regenerated successfully",
                "webhook_secret", newSecret
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
