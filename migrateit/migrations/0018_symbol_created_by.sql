-- Migration 0018_symbol_created_by.sql
-- Created on 2025-11-25T09:31:11.998667

ALTER TABLE symbols ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) DEFAULT NULL;
ALTER TABLE symbols DROP COLUMN IF EXISTS user_created;

-- Rollback migration

ALTER TABLE symbols DROP COLUMN IF EXISTS created_by;
ALTER TABLE symbols ADD COLUMN IF NOT EXISTS user_created BOOLEAN NOT NULL DEFAULT FALSE;
