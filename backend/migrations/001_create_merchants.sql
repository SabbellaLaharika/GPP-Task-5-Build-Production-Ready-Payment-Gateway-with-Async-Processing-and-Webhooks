-- Migration: 001_create_merchants.sql
-- Purpose: Store merchant authentication and configuration
-- Table: merchants

-- Drop table if exists (for development/testing)
DROP TABLE IF EXISTS merchants CASCADE;

-- Create merchants table
CREATE TABLE merchants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    api_key VARCHAR(64) UNIQUE NOT NULL,
    api_secret VARCHAR(64) NOT NULL,
    webhook_url TEXT,
    webhook_secret VARCHAR(64),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on email for faster lookups
CREATE INDEX idx_merchants_email ON merchants(email);

-- Create index on api_key for faster authentication lookups
CREATE INDEX idx_merchants_api_key ON merchants(api_key);

-- Add comment to table
COMMENT ON TABLE merchants IS 'Store merchant authentication and configuration';

-- Add comments to columns
COMMENT ON COLUMN merchants.id IS 'Primary Key, VARCHAR/UUID';
COMMENT ON COLUMN merchants.name IS 'Merchant Name';
COMMENT ON COLUMN merchants.email IS 'Unique email address';
COMMENT ON COLUMN merchants.api_key IS 'Unique API key for authentication';
COMMENT ON COLUMN merchants.api_secret IS 'API secret for authentication';
COMMENT ON COLUMN merchants.webhook_url IS 'Optional URL for webhook events';
COMMENT ON COLUMN merchants.webhook_secret IS 'Secret for HMAC signature generation';
COMMENT ON COLUMN merchants.is_active IS 'Boolean flag for active status';

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Table "merchants" created successfully';
END $$;
