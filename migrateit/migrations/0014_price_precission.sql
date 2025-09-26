-- Migration 0014_price_precission.sql
-- Created on 2025-09-26T10:09:21.332532

ALTER TABLE transactions ALTER COLUMN price SET DATA TYPE numeric(10, 3);

-- Rollback migration

ALTER TABLE transactions ALTER COLUMN price SET DATA TYPE numeric(10, 2);
