-- Migration 0002_session.sql
-- Created on 2025-05-17T18:27:45.210700

CREATE TABLE IF NOT EXISTS sessions (
	id TEXT NOT NULL,
	user_id UUID NOT NULL,
	tokens TEXT NOT NULL,
	expires TEXT NOT NULL,
	updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY ("id"),
	FOREIGN KEY ("user_id") REFERENCES users(id) ON DELETE CASCADE
);

-- Rollback migration

DROP TABLE IF EXISTS sessions;
