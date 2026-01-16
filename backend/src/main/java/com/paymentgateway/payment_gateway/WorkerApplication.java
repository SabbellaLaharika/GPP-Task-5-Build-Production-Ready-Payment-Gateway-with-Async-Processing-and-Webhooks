package com.paymentgateway.payment_gateway;

import com.paymentgateway.payment_gateway.queue.JobQueue;
import com.paymentgateway.payment_gateway.workers.PaymentWorker;
import com.paymentgateway.payment_gateway.workers.RefundWorker;
import com.paymentgateway.payment_gateway.workers.WebhookWorker;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@SpringBootApplication
public class WorkerApplication {
    
    private static final Logger log = LoggerFactory.getLogger(WorkerApplication.class);
    
    public static void main(String[] args) {
        String workerMode = System.getenv("WORKER_MODE");
        
        if ("true".equals(workerMode)) {
            log.info("Starting Worker Application...");
            SpringApplication.run(WorkerApplication.class, args);
        } else {
            log.info("Starting Main API Application...");
            SpringApplication.run(PaymentGatewayApplication.class, args);
        }
    }
    
    @Bean
    public CommandLineRunner startWorkers(
            PaymentWorker paymentWorker,
            WebhookWorker webhookWorker,
            RefundWorker refundWorker,
            JobQueue jobQueue) {
        
        return args -> {
            String workerMode = System.getenv("WORKER_MODE");
            if (!"true".equals(workerMode)) {
                return; // Do not start workers in non-worker mode (e.g. Backend API)
            }

            log.info("=================================================");
            log.info("WORKER APPLICATION STARTED");
            log.info("=================================================");
            
            try {
                // Global wait for Redis to be fully ready
                log.info("Waiting for Redis to initialize...");
                Thread.sleep(15000); 
                
                jobQueue.updateWorkerStatus("running");
            } catch (Exception e) {
                log.error("Failed to update worker status or wait interrupted", e);
            }
            
            ExecutorService executorService = Executors.newFixedThreadPool(3);
            
            executorService.submit(() -> {
                try {
                    paymentWorker.processPayments();
                } catch (Exception e) {
                    log.error("PaymentWorker crashed", e);
                }
            });
            
            executorService.submit(() -> {
                try {
                    webhookWorker.processWebhooks();
                } catch (Exception e) {
                    log.error("WebhookWorker crashed", e);
                }
            });
            
            executorService.submit(() -> {
                try {
                    refundWorker.processRefunds();
                } catch (Exception e) {
                    log.error("RefundWorker crashed", e);
                }
            });
            
            log.info("All workers started successfully");
            
            Runtime.getRuntime().addShutdownHook(new Thread(() -> {
                log.info("Shutting down workers...");
                jobQueue.updateWorkerStatus("stopped");
                executorService.shutdownNow();
            }));
        };
    }
}