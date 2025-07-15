-- Migration 0012_account_currency.sql
-- Created on 2025-07-15T12:03:08.198554

ALTER TABLE accounts ADD COLUMN currency VARCHAR(3) NOT NULL DEFAULT 'USD';

-- Rollback migration

ALTER TABLE accounts DROP COLUMN currency;
