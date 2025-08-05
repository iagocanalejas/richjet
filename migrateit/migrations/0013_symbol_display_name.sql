-- Migration 0013_symbol_display_name.sql
-- Created on 2025-08-05T11:09:53.504553


ALTER TABLE symbols ADD COLUMN display_name TEXT NOT NULL DEFAULT '';

-- Rollback migration

ALTER TABLE symbols DROP COLUMN IF EXISTS display_name;
