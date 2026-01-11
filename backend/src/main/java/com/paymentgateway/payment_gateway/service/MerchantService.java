package com.paymentgateway.payment_gateway.service;

import com.paymentgateway.payment_gateway.entity.Merchant;
import com.paymentgateway.payment_gateway.repository.MerchantRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
@RequiredArgsConstructor
public class MerchantService {

    private final MerchantRepository merchantRepository;

    // Auto-seed test merchant on application startup
    @PostConstruct
    @Transactional
    public void seedTestMerchant() {
        String testEmail = "test@example.com";
        
        // Check if test merchant already exists
        Optional<Merchant> existingMerchant = merchantRepository.findByEmail(testEmail);
        
        if (existingMerchant.isEmpty()) {
            Merchant testMerchant = new Merchant();
            testMerchant.setName("Test Merchant");
            testMerchant.setEmail(testEmail);
            testMerchant.setApiKey("key_test_abc123");
            testMerchant.setApiSecret("secret_test_xyz789");
            testMerchant.setIsActive(true);
            
            Merchant saved = merchantRepository.save(testMerchant);
            System.out.println("✅ Test merchant created with ID: " + saved.getId());
            System.out.println("   Email: " + testEmail);
            System.out.println("   API Key: key_test_abc123");
            System.out.println("   API Secret: secret_test_xyz789");
        } else {
            System.out.println("ℹ️  Test merchant already exists (ID: " + existingMerchant.get().getId() + ")");
            System.out.println("   Email: " + testEmail);
            System.out.println("   API Key: key_test_abc123");
            System.out.println("   API Secret: secret_test_xyz789");
        }
    }

    public Optional<Merchant> findByApiKey(String apiKey) {
        return merchantRepository.findByApiKey(apiKey);
    }

    public Optional<Merchant> findById(String id) {
        return merchantRepository.findById(id);
    }

    public Optional<Merchant> findByEmail(String email) {   
        return merchantRepository.findByEmail(email);
    }
    
    public Merchant save(Merchant merchant) {
        return merchantRepository.save(merchant);
    }
}