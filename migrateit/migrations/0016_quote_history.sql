-- Migration 0016_quote_history.sql
-- Created on 2025-10-14T10:28:19.725115

CREATE TABLE IF NOT EXISTS quote_history (
	id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
	symbol_id UUID NOT NULL,
	price NUMERIC(18, 8) NOT NULL,
	currency TEXT NOT NULL DEFAULT 'USD',
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (symbol_id) REFERENCES symbols (id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS quote_history_symbol_day_idx
ON quote_history (symbol_id, (created_at::date));

-- Rollback migration

DROP INDEX IF EXISTS quote_history_symbol_day_idx;
DROP TABLE IF EXISTS quote_history;
