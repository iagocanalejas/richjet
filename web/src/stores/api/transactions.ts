import type { TransactionItem } from '@/types/portfolio';
import { useErrorsStore, type CustomError } from '../errors';

const BASE_URL = import.meta.env.VITE_BACKEND_BASE_URL || '/api';

const addError = (e: CustomError) => useErrorsStore().addError(e);

async function loadTransactions() {
    const url = `${BASE_URL}/transactions`;
    try {
        const res = await fetch(url, { method: 'GET', credentials: 'include' });
        if (!res.ok) {
            const err = await res.json();
            addError({
                readable_message: err.detail ?? 'Failed to fetch transactions',
                trace: { status: res.status, statusText: res.statusText, url: res.url },
            });
            return [];
        }
        const transactions: TransactionItem[] = await res.json();
        transactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        return transactions.reverse();
    } catch (err) {
        addError({
            readable_message: 'Failed to fetch transactions',
            trace: {
                status: err instanceof Error ? err.message : String(err),
                url: url,
            },
        });
        return [];
    }
}

async function addTransaction(transaction: TransactionItem) {
    const url = `${BASE_URL}/transactions`;
    try {
        const res = await fetch(url, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(transaction),
        });
        if (!res.ok) {
            const err = await res.json();
            addError({
                readable_message: err.detail ?? 'Error adding transaction',
                trace: { status: res.status, statusText: res.statusText, url: res.url },
            });
            return;
        }
        return (await res.json()) as TransactionItem;
    } catch (err) {
        addError({
            readable_message: 'Error adding transaction',
            trace: {
                status: err instanceof Error ? err.message : String(err),
                url: url,
            },
        });
    }
}

async function transferStock(symbol: string, fromAccount?: string, toAccount?: string) {
    const url = `${BASE_URL}/transactions/${symbol}`;
    try {
        const res = await fetch(url, {
            method: 'PUT',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ from_account: fromAccount, to_account: toAccount }),
        });
        if (!res.ok) {
            const err = await res.json();
            addError({
                readable_message: err.detail ?? 'Failed to transfer stock',
                trace: { status: res.status, statusText: res.statusText, url: res.url },
            });
            return [];
        }
        return (await res.json()) as string[];
    } catch (err) {
        addError({
            readable_message: 'Failed to transfer stock',
            trace: {
                status: err instanceof Error ? err.message : String(err),
                url: url,
            },
        });
        return [];
    }
}

async function removeTransaction(transactionId: string) {
    const url = `${BASE_URL}/transactions/${transactionId}`;
    try {
        const res = await fetch(url, { method: 'DELETE', credentials: 'include' });
        if (!res.ok) {
            const err = await res.json();
            addError({
                readable_message: err.detail ?? 'Error removing transaction',
                trace: { status: res.status, statusText: res.statusText, url: res.url },
            });
            return false;
        }
        return true;
    } catch (err) {
        addError({
            readable_message: 'Error removing transaction',
            trace: {
                status: err instanceof Error ? err.message : String(err),
                url: url,
            },
        });
        return false;
    }
}

const TransactionsService = {
    loadTransactions,
    addTransaction,
    transferStock,
    removeTransaction,
};
export default TransactionsService;
