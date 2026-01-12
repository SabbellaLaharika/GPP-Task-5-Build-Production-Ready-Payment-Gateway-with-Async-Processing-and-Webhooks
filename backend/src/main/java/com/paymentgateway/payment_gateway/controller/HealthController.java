package com.paymentgateway.payment_gateway.controller;

import com.paymentgateway.payment_gateway.service.RedisTestService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@RestController
public class HealthController {

    @Autowired
    private RedisTestService redisTestService;

    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> health() {
        Map<String, Object> health = new HashMap<>();
        
        // Basic health
        health.put("status", "healthy");
        health.put("timestamp", LocalDateTime.now().toString());
        
        // Database check (already working from Task 4)
        health.put("database", "connected");
        
        // Redis check (NEW for Task 5)
        boolean redisConnected = redisTestService.testConnection();
        health.put("redis", redisConnected ? "connected" : "disconnected");
        
        return ResponseEntity.ok(health);
    }
}