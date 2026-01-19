-- Migration: 004_create_refunds.sql
-- Purpose: Store refund transactions
-- Table: refunds

DROP TABLE IF EXISTS refunds CASCADE;

CREATE TABLE refunds (
    id VARCHAR(64) PRIMARY KEY, -- Format: "rfnd_" + 16 alphanumeric characters
    payment_id VARCHAR(64) NOT NULL,
    merchant_id UUID NOT NULL,
    amount INTEGER NOT NULL, -- Refund amount in smallest currency unit
    reason TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processed')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP,
    
    -- Foreign Key Constraints
    CONSTRAINT fk_refunds_payment
        FOREIGN KEY (payment_id)
        REFERENCES payments(id)
        ON DELETE CASCADE,
        
    CONSTRAINT fk_refunds_merchant
        FOREIGN KEY (merchant_id)
        REFERENCES merchants(id)
        ON DELETE CASCADE
);

CREATE INDEX idx_refunds_payment_id ON refunds(payment_id);
CREATE INDEX idx_refunds_merchant_id ON refunds(merchant_id);
CREATE INDEX idx_refunds_status ON refunds(status);

COMMENT ON TABLE refunds IS 'Store refund transactions';
