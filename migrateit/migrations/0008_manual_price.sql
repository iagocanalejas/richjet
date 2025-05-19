-- Migration 0008_manual_price.sql
-- Created on 2025-05-27T09:39:07.186394

ALTER TABLE watchlist ADD COLUMN manual_price DECIMAL(10, 2) DEFAULT NULL;

-- Rollback migration

ALTER TABLE watchlist DROP COLUMN IF EXISTS manual_price;
