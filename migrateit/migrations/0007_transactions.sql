-- Migration 0007_transactions.sql
-- Created on 2025-05-22T09:58:46.282349

CREATE TABLE IF NOT EXISTS transactions (
	id SERIAL PRIMARY KEY,
	user_id INT NOT NULL,
	symbol_id INT NOT NULL,
	account_id INT,
	quantity DECIMAL(10, 2) NOT NULL,
	price DECIMAL(10, 2) NOT NULL,
	commission DECIMAL(10, 2) NOT NULL,
	currency VARCHAR(3) NOT NULL,
	transaction_type TEXT NOT NULL CHECK (transaction_type IN ('BUY', 'SELL', 'DIVIDEND', 'DIVIDEND-CASH')),
	date TIMESTAMP,
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
	FOREIGN KEY (symbol_id) REFERENCES symbols(id) ON DELETE CASCADE,
	FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);

-- Rollback migration

DROP TABLE IF EXISTS transactions;
