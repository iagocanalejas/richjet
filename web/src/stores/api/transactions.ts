import type { TransactionItem } from '@/types/portfolio';
import { safeFetch } from './_utils';

const BASE_URL = import.meta.env.VITE_BACKEND_BASE_URL || '/api';

function loadTransactions() {
    const f = fetch(`${BASE_URL}/transactions`, { method: 'GET', credentials: 'include' });
    return safeFetch<TransactionItem[]>(f, 'Failed to fetch transactions', []);
}

function addTransaction(transaction: TransactionItem) {
    const f = fetch(`${BASE_URL}/transactions`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transaction),
    });
    return safeFetch<TransactionItem>(f, 'Error adding transaction');
}

function updateTransaction(transaction: TransactionItem) {
    const f = fetch(`${BASE_URL}/transactions/${transaction.id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transaction),
    });
    return safeFetch<TransactionItem>(f, 'Error updating transaction');
}

function transferStock(symbol: string, fromAccount?: string, toAccount?: string) {
    const f = fetch(`${BASE_URL}/transactions/${symbol}/account`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from_account: fromAccount, to_account: toAccount }),
    });
    return safeFetch<string[]>(f, 'Failed to transfer stock', []);
}

function removeTransaction(transactionId: string) {
    const f = fetch(`${BASE_URL}/transactions/${transactionId}`, { method: 'DELETE', credentials: 'include' });
    return safeFetch(f, 'Error removing transaction', false);
}

const TransactionsService = {
    loadTransactions,
    addTransaction,
    updateTransaction,
    transferStock,
    removeTransaction,
};
export default TransactionsService;
