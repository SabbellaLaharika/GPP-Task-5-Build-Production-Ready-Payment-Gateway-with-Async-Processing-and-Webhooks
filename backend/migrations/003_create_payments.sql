-- Migration: 003_create_payments.sql
-- Purpose: Store payment transactions
-- Table: payments

-- Drop table if exists (for development/testing)
DROP TABLE IF EXISTS payments CASCADE;

-- Create payments table
CREATE TABLE payments (
    id VARCHAR(64) PRIMARY KEY, -- Format: "pay_" + 16 alphanumeric characters
    order_id VARCHAR(64) NOT NULL,
    merchant_id UUID NOT NULL,
    amount INTEGER NOT NULL, -- Amount in smallest currency unit
    currency CHAR(3) DEFAULT 'INR' NOT NULL,
    method VARCHAR(20) NOT NULL CHECK (method IN ('upi', 'card')),
    status VARCHAR(20) DEFAULT 'created' NOT NULL, -- Initial status, usually updates to 'processing' immediately
    vpa VARCHAR(255), -- Only for UPI
    card_network VARCHAR(20) CHECK (card_network IN ('visa', 'mastercard', 'amex', 'rupay', 'unknown')), -- Only for card
    card_last4 CHAR(4), -- Only for card
    error_code VARCHAR(50),
    error_description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign Key Constraints
    CONSTRAINT fk_payments_order
        FOREIGN KEY (order_id)
        REFERENCES orders(id)
        ON DELETE CASCADE,
        
    CONSTRAINT fk_payments_merchant
        FOREIGN KEY (merchant_id)
        REFERENCES merchants(id)
        ON DELETE CASCADE
);

-- Create index on order_id for efficient lookups
CREATE INDEX idx_payments_order_id ON payments(order_id);

-- Create index on status for filtering
CREATE INDEX idx_payments_status ON payments(status);

-- Add comment to table
COMMENT ON TABLE payments IS 'Store payment transactions';

-- Add comments to columns
COMMENT ON COLUMN payments.id IS 'Primary Key, format: pay_ + 16 chars';
COMMENT ON COLUMN payments.order_id IS 'Foreign Key to orders table';
COMMENT ON COLUMN payments.merchant_id IS 'Foreign Key to merchants table';
COMMENT ON COLUMN payments.amount IS 'Payment amount in smallest unit';
COMMENT ON COLUMN payments.method IS 'Payment method: upi or card';
COMMENT ON COLUMN payments.status IS 'Payment status: created, processing, success, failed';
COMMENT ON COLUMN payments.vpa IS 'Virtual Payment Address (UPI only)';
COMMENT ON COLUMN payments.card_network IS 'Card network (Visa, Mastercard, etc.)';
COMMENT ON COLUMN payments.card_last4 IS 'Last 4 digits of card';

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Table "payments" created successfully';
END $$;
