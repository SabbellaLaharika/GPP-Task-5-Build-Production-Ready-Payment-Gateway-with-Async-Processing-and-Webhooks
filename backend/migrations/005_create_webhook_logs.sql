-- Migration: 005_create_webhook_logs.sql
-- Purpose: Log webhook events and delivery attempts
-- Table: webhook_logs

DROP TABLE IF EXISTS webhook_logs CASCADE;

CREATE TABLE webhook_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID NOT NULL,
    event VARCHAR(50) NOT NULL,
    payload JSONB NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed')),
    attempts INTEGER DEFAULT 0,
    last_attempt_at TIMESTAMP,
    next_retry_at TIMESTAMP,
    response_code INTEGER,
    response_body TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Foreign Key Constraint
    CONSTRAINT fk_webhook_logs_merchant
        FOREIGN KEY (merchant_id)
        REFERENCES merchants(id)
        ON DELETE CASCADE
);

CREATE INDEX idx_webhook_logs_merchant_id ON webhook_logs(merchant_id);
CREATE INDEX idx_webhook_logs_status ON webhook_logs(status);
CREATE INDEX idx_webhook_logs_next_retry ON webhook_logs(next_retry_at) WHERE status = 'pending';

COMMENT ON TABLE webhook_logs IS 'Log webhook events and delivery attempts';
