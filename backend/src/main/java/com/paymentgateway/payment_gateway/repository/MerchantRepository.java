package com.paymentgateway.payment_gateway.repository;

import com.paymentgateway.payment_gateway.entity.Merchant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface MerchantRepository extends JpaRepository<Merchant, String> {
    Optional<Merchant> findByApiKey(String apiKey);
    Optional<Merchant> findByEmail(String email);
    boolean existsByEmail(String email);
}