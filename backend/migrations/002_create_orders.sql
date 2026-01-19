-- Migration: 002_create_orders.sql
-- Purpose: Store order details
-- Table: orders

-- Drop table if exists (for development/testing)
DROP TABLE IF EXISTS orders CASCADE;

-- Create orders table
CREATE TABLE orders (
    id VARCHAR(64) PRIMARY KEY, -- Format: "order_" + 16 alphanumeric characters
    merchant_id UUID NOT NULL,
    amount INTEGER NOT NULL CHECK (amount >= 100), -- Amount in smallest currency unit (e.g., paise)
    currency CHAR(3) DEFAULT 'INR' NOT NULL,
    receipt VARCHAR(255),
    notes JSONB,
    status VARCHAR(20) DEFAULT 'created' NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign Key Constraint
    CONSTRAINT fk_orders_merchant
        FOREIGN KEY (merchant_id)
        REFERENCES merchants(id)
        ON DELETE CASCADE
);

-- Create index on merchant_id for filtering orders by merchant
CREATE INDEX idx_orders_merchant_id ON orders(merchant_id);

-- Create index on receipt for lookups
CREATE INDEX idx_orders_receipt ON orders(receipt);

-- Create index on status for filtering/analytics
CREATE INDEX idx_orders_status ON orders(status);

-- Add comment to table
COMMENT ON TABLE orders IS 'Store order details';

-- Add comments to columns
COMMENT ON COLUMN orders.id IS 'Primary Key, format: order_ + 16 chars';
COMMENT ON COLUMN orders.merchant_id IS 'Foreign Key to merchants table';
COMMENT ON COLUMN orders.amount IS 'Amount in rupees, min 100';
COMMENT ON COLUMN orders.currency IS 'Currency code, default INR';
COMMENT ON COLUMN orders.receipt IS 'Optional unique receipt identifier';
COMMENT ON COLUMN orders.notes IS 'Additional metadata as JSON';
COMMENT ON COLUMN orders.status IS 'Order status (created, paid, etc.)';

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Table "orders" created successfully';
END $$;
