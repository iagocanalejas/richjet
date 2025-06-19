-- Migration 0009_constraints.sql
-- Created on 2025-06-19T12:09:46.321520

ALTER TABLE symbols
	ADD CONSTRAINT uk_ticker UNIQUE (ticker),
	ADD CONSTRAINT uk_isin UNIQUE (isin),
	ADD CONSTRAINT uk_figi UNIQUE (figi);

ALTER TABLE symbols ADD COLUMN IF NOT EXISTS user_created BOOLEAN NOT NULL DEFAULT FALSE;

-- Rollback migration

ALTER TABLE symbols DROP COLUMN IF EXISTS user_created;

ALTER TABLE symbols
	DROP CONSTRAINT IF EXISTS uk_ticker,
	DROP CONSTRAINT IF EXISTS uk_isin,
	DROP CONSTRAINT IF EXISTS uk_figi;

