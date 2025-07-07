-- Migration 0011_subscriptions.sql
-- Created on 2025-07-07T12:26:43.974836

CREATE TABLE IF NOT EXISTS plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stripe_id VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO plans (id, stripe_id, name, enabled) VALUES
    (gen_random_uuid(), 'rchjt_free', 'FREE', TRUE),
    (gen_random_uuid(), 'update1', 'LITE', TRUE),
    (gen_random_uuid(), 'update2', 'LITE', TRUE),
    (gen_random_uuid(), 'update3', 'PRO', TRUE),
    (gen_random_uuid(), 'update4', 'PRO', TRUE),
    (gen_random_uuid(), 'update5', 'MAX', TRUE),
    (gen_random_uuid(), 'update6', 'MAX', TRUE),
    (gen_random_uuid(), 'rchjt_admin', 'ADMIN', TRUE);

ALTER TABLE users ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES plans(id) ON DELETE RESTRICT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_id VARCHAR(255) UNIQUE;

-- Rollback migration

ALTER TABLE users DROP COLUMN IF EXISTS stripe_id;
ALTER TABLE users DROP COLUMN IF EXISTS plan_id;

DROP TABLE IF EXISTS plans;
