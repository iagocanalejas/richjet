-- Migration 0005_watchlist.sql
-- Created on 2025-05-20T15:31:08.958270

CREATE TABLE IF NOT EXISTS watchlist (
	id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
	user_id UUID NOT NULL,
	symbol_id UUID NOT NULL,
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
	FOREIGN KEY (symbol_id) REFERENCES symbols (id) ON DELETE CASCADE
);

-- Rollback migration

DROP TABLE IF EXISTS watchlist;
