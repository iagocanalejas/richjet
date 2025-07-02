import type { Account } from '@/types/user';
import { useErrorsStore, type CustomError } from '../errors';

const BASE_URL = import.meta.env.VITE_BACKEND_BASE_URL || '/api';

const addError = (e: CustomError) => useErrorsStore().addError(e);

async function retrieveAccounts() {
    const url = `${BASE_URL}/accounts`;
    try {
        const res = await fetch(url, { method: 'GET', credentials: 'include' });
        if (!res.ok) {
            const err = await res.json();
            addError({
                readable_message: err.detail ?? 'Failed to fetch accounts',
                trace: { status: res.status, statusText: res.statusText, url: res.url },
            });
            return [];
        }
        const accounts: Account[] = await res.json();
        accounts.sort((a, b) => a.name.localeCompare(b.name));
        return accounts;
    } catch (err) {
        addError({
            readable_message: 'Failed to fetch accounts',
            trace: {
                status: err instanceof Error ? err.message : String(err),
                url: url,
            },
        });
        return [];
    }
}

async function addAccount(account: Account) {
    const url = `${BASE_URL}/accounts`;
    try {
        const res = await fetch(url, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(account),
        });
        if (!res.ok) {
            const err = await res.json();
            addError({
                readable_message: err.detail ?? 'Error creating account',
                trace: { status: res.status, statusText: res.statusText, url: res.url },
            });
            return;
        }
        return (await res.json()) as Account;
    } catch (error) {
        addError({
            readable_message: 'Error creating account',
            trace: { status: (error as Error).message, url: `${BASE_URL}/accounts` },
        });
    }
}

async function removeAccount(accountId: string) {
    const url = `${BASE_URL}/accounts/${accountId}`;
    try {
        const res = await fetch(url, { method: 'DELETE', credentials: 'include' });
        if (!res.ok) {
            const err = await res.json();
            addError({
                readable_message: err.detail ?? 'Error deleting account',
                trace: { status: res.status, statusText: res.statusText, url: res.url },
            });
            return false;
        }
        return true;
    } catch (error) {
        addError({
            readable_message: 'Error deleting account',
            trace: { status: (error as Error).message, url },
        });
        return false;
    }
}

const AccountsService = {
    retrieveAccounts,
    addAccount,
    removeAccount,
};
export default AccountsService;
