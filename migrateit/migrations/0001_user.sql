-- Migration 0001_user.sql
-- Created on 2025-05-15T19:55:18.711752
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS users (
	id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
	email TEXT NOT NULL UNIQUE,
	given_name TEXT,
	family_name TEXT,
	picture TEXT,
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Rollback migration

DROP TABLE IF EXISTS users;
DROP EXTENSION IF EXISTS "uuid-ossp";
