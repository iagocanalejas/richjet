import type { Account } from '@/types/user';
import { useErrorsStore, type CustomError } from '../errors';

const BASE_URL = import.meta.env.VITE_BACKEND_BASE_URL || '/api';

const addError = (e: CustomError) => useErrorsStore().addError(e);

async function retrieveAccounts() {
    const url = `${BASE_URL}/accounts`;
    try {
        const res = await fetch(url, { method: 'GET', credentials: 'include' });
        if (!res.ok) {
            addError({
                readable_message: 'Failed to fetch accounts',
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
            addError({
                readable_message: 'Error creating account',
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

const AccountsService = {
    retrieveAccounts,
    addAccount,
};
export default AccountsService;
