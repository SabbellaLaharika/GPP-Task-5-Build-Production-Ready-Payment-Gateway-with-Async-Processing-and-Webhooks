package com.paymentgateway.payment_gateway.service;

import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

@Service
public class RedisTestService {
    
    private final org.springframework.data.redis.core.StringRedisTemplate redisTemplate;
    
    public RedisTestService(org.springframework.data.redis.core.StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }
    
    public boolean testConnection() {
        try {
            redisTemplate.opsForValue().set("test:connection", "success");
            String value = (String) redisTemplate.opsForValue().get("test:connection");
            return "success".equals(value);
        } catch (Exception e) {
            System.err.println("Redis test connection failed: " + e.getMessage());
            e.printStackTrace();
            return false;
        }
    }
    
    public void storePaymentJob(String paymentId, String status) {
        String key = "payment:job:" + paymentId;
        redisTemplate.opsForValue().set(key, status);
    }
    
    public String getPaymentJob(String paymentId) {
        String key = "payment:job:" + paymentId;
        return (String) redisTemplate.opsForValue().get(key);
    }
}