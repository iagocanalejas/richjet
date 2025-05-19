-- Migration 0003_user_currency.sql
-- Created on 2025-05-19T13:04:04.166290

ALTER TABLE users ADD COLUMN currency TEXT NOT NULL DEFAULT 'USD';

-- Rollback migration

ALTER TABLE users DROP COLUMN currency;
