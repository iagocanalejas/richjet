-- Migration 0005_watchlist.sql
-- Created on 2025-05-20T15:31:08.958270

CREATE TABLE IF NOT EXISTS watchlist (
	id SERIAL PRIMARY KEY,
	user_id INTEGER NOT NULL,
	symbol_id INTEGER NOT NULL,
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
	FOREIGN KEY (symbol_id) REFERENCES symbols (id) ON DELETE CASCADE
);

-- Rollback migration

DROP TABLE IF EXISTS watchlist;
