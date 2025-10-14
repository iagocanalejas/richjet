-- Migration 0015_remove_symbol_columns.sql
-- Created on 2025-10-12T19:04:24.237950

ALTER TABLE symbols
DROP COLUMN market_sector,
DROP COLUMN figi;

-- Rollback migration

ALTER TABLE symbols
ADD COLUMN market_sector TEXT CHECK (market_sector IN ('COMMODITY', 'CORPORATE', 'CURRENCY', 'EQUITY', 'GOVERNMENT','INDEX', 'MONEY_MARKET', 'MORTGAGE', 'MUNICIPAL', 'PREFERRED')),
ADD COLUMN figi TEXT;
