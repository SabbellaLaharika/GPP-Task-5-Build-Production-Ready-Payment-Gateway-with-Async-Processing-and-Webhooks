-- Migration: 006_create_idempotency_keys.sql
-- Purpose: Prevent duplicate requests
-- Table: idempotency_keys

DROP TABLE IF EXISTS idempotency_keys CASCADE;

CREATE TABLE idempotency_keys (
    key VARCHAR(255) NOT NULL,
    merchant_id UUID NOT NULL,
    response JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    
    PRIMARY KEY (key, merchant_id),
    
    -- Foreign Key Constraint
    CONSTRAINT fk_idempotency_merchant
        FOREIGN KEY (merchant_id)
        REFERENCES merchants(id)
        ON DELETE CASCADE
);

-- Index on expiration for cleanup
CREATE INDEX idx_idempotency_expires_at ON idempotency_keys(expires_at);

COMMENT ON TABLE idempotency_keys IS 'Prevent duplicate requests';
