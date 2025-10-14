-- Migration 0014_price_precission.sql
-- Created on 2025-09-26T10:09:21.332532

ALTER TABLE transactions ALTER COLUMN quantity SET DATA TYPE numeric(18, 8);
ALTER TABLE transactions ALTER COLUMN price SET DATA TYPE numeric(18, 8);
ALTER TABLE transactions ALTER COLUMN commission SET DATA TYPE numeric(18, 8);
ALTER TABLE watchlist ALTER COLUMN manual_price SET DATA TYPE numeric(18, 8);

-- Rollback migration

ALTER TABLE transactions ALTER COLUMN commission SET DATA TYPE numeric(10, 2);
ALTER TABLE transactions ALTER COLUMN price SET DATA TYPE numeric(10, 2);
ALTER TABLE transactions ALTER COLUMN quantity SET DATA TYPE numeric(10, 2);
ALTER TABLE watchlist ALTER COLUMN manual_price SET DATA TYPE numeric(10, 2);
