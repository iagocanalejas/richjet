-- Migration 0006_accounts.sql
-- Created on 2025-05-21T11:17:30.779530

CREATE TABLE IF NOT EXISTS accounts (
	id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
	user_id UUID NOT NULL,
	name TEXT NOT NULL,
	account_type TEXT NOT NULL CHECK (account_type IN ('BROKER', 'BANK')),
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Rollback migration

DROP TABLE IF EXISTS accounts;
