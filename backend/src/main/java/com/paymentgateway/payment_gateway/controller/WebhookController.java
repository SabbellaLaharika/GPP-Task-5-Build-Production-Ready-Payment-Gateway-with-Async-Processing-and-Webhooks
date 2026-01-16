package com.paymentgateway.payment_gateway.controller;

import com.paymentgateway.payment_gateway.entity.WebhookLog;
import com.paymentgateway.payment_gateway.service.WebhookService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/webhooks")
public class WebhookController {

    @Autowired
    private WebhookService webhookService;
    
    @Autowired
    private com.paymentgateway.payment_gateway.service.MerchantService merchantService;

    @GetMapping
    public ResponseEntity<?> getWebhookLogs(
            @RequestHeader("X-Api-Key") String apiKey,
            @RequestHeader("X-Api-Secret") String apiSecret,
            @RequestParam(defaultValue = "10") int limit,
            @RequestParam(defaultValue = "0") int offset) {
            
        // Validate API credentials
        java.util.Optional<com.paymentgateway.payment_gateway.entity.Merchant> merchantOpt = merchantService.findByApiKey(apiKey);
        if (merchantOpt.isEmpty() || !merchantOpt.get().getApiSecret().equals(apiSecret)) {
            return ResponseEntity.status(401)
                    .body(Map.of("error", "AUTHENTICATION_ERROR", "message", "Invalid API credentials"));
        }
        
        // Convert offset to page number
        int page = offset / limit;
        
        Page<WebhookLog> logPage = webhookService.getWebhookLogs(page, limit);
        
        Map<String, Object> response = new HashMap<>();
        response.put("data", logPage.getContent());
        response.put("total", logPage.getTotalElements());
        response.put("limit", limit);
        response.put("offset", offset);
        
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{webhookId}/retry")
    public ResponseEntity<?> retryWebhook(
            @RequestHeader("X-Api-Key") String apiKey,
            @RequestHeader("X-Api-Secret") String apiSecret,
            @PathVariable UUID webhookId) {
            
        // Validate API credentials
        java.util.Optional<com.paymentgateway.payment_gateway.entity.Merchant> merchantOpt = merchantService.findByApiKey(apiKey);
        if (merchantOpt.isEmpty() || !merchantOpt.get().getApiSecret().equals(apiSecret)) {
            return ResponseEntity.status(401)
                    .body(Map.of("error", "AUTHENTICATION_ERROR", "message", "Invalid API credentials"));
        }

        try {
            WebhookLog webhook = webhookService.retryWebhook(webhookId);
            
            Map<String, Object> response = new HashMap<>();
            response.put("id", webhook.getId());
            response.put("status", webhook.getStatus());
            response.put("message", "Webhook retry scheduled");
            
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
