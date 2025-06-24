-- Migration 0004_symbols.sql
-- Created on 2025-05-20T15:08:10.232015

CREATE TABLE IF NOT EXISTS symbols (
	id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
	ticker TEXT NOT NULL,
	name TEXT NOT NULL,
	currency TEXT NOT NULL DEFAULT 'USD',
	source TEXT NOT NULL,
	security_type TEXT NOT NULL CHECK (security_type IN ('STOCK', 'ETP', 'INDEX', 'GDR', 'CRYPTO', 'BOND')),
	picture TEXT,
	market_sector TEXT CHECK (market_sector IN ('COMMODITY', 'CORPORATE', 'CURRENCY', 'EQUITY', 'GOVERNMENT','INDEX', 'MONEY_MARKET', 'MORTGAGE', 'MUNICIPAL', 'PREFERRED')),
	isin TEXT,
	figi TEXT,
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_symbols_ticker ON symbols (ticker);
CREATE INDEX IF NOT EXISTS idx_symbols_isin ON symbols (isin);
CREATE INDEX IF NOT EXISTS idx_symbols_figi ON symbols (figi);

-- Rollback migration

DROP INDEX IF EXISTS idx_symbols_symbol;
DROP INDEX IF EXISTS idx_symbols_isin;
DROP INDEX IF EXISTS idx_symbols_figi;
DROP TABLE IF EXISTS symbols;
