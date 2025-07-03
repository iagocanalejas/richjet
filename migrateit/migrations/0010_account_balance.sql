-- Migration 0010_account_balance.sql
-- Created on 2025-07-02T18:22:50.576547

ALTER TABLE accounts
ADD COLUMN balance DECIMAL(10, 2) DEFAULT NULL;

UPDATE accounts SET balance = 0.00
WHERE account_type = 'BANK' AND balance IS NULL;

ALTER TABLE accounts
ADD CONSTRAINT balance_required_for_bank
CHECK (account_type != 'BANK' OR balance IS NOT NULL);

CREATE TABLE IF NOT EXISTS account_balances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID NOT NULL,
    balance DECIMAL(10, 2) NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (account_id) REFERENCES accounts(id)
);

-- Rollback migration

DROP TABLE IF EXISTS account_balances;

ALTER TABLE accounts
DROP CONSTRAINT IF EXISTS balance_required_for_bank;

ALTER TABLE accounts
DROP COLUMN balance;
