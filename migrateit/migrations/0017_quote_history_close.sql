-- Migration 0017_quote_history_close.sql
-- Created on 2025-10-20T11:28:28.488999

ALTER TABLE quote_history ADD COLUMN previous_close NUMERIC(18, 8);

-- Rollback migration

ALTER TABLE quote_history DROP COLUMN previous_close;
