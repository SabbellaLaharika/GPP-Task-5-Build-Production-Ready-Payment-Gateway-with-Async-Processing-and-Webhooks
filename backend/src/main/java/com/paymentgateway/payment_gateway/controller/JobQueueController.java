package com.paymentgateway.payment_gateway.controller;

import com.paymentgateway.payment_gateway.queue.JobQueue;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/queue")
public class JobQueueController {

    @Autowired
    private JobQueue jobQueue;

    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> getQueueStatus() {
        return ResponseEntity.ok(jobQueue.getQueueStats());
    }
}
