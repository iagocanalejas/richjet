import type { Account } from '@/types/user';
import { safeFetch } from './_utils';

const BASE_URL = import.meta.env.VITE_BACKEND_BASE_URL || '/api';

function retrieveAccounts() {
    const f = fetch(`${BASE_URL}/accounts`, { method: 'GET', credentials: 'include' });
    return safeFetch<Account[]>(f, 'Failed to fetch accounts', []);
}

function addAccount(account: Account) {
    const res = fetch(`${BASE_URL}/accounts`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(account),
    });
    return safeFetch<Account>(res, 'Error creating account');
}

function updateAccount(account: Account) {
    const res = fetch(`${BASE_URL}/accounts/${account.id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(account),
    });
    return safeFetch<Account>(res, 'Error updating account');
}

function removeAccount(accountId: string, forced = false) {
    const res = fetch(`${BASE_URL}/accounts/${accountId}?forced=${forced}`, {
        method: 'DELETE',
        credentials: 'include',
    });
    return safeFetch(res, 'Error deleting account', false);
}

function removeAccountBalance(accountId: string, balanceId: string) {
    const res = fetch(`${BASE_URL}/accounts/${accountId}/balances/${balanceId}`, {
        method: 'DELETE',
        credentials: 'include',
    });
    return safeFetch<Account>(res, 'Error deleting account balance');
}

const AccountsService = {
    retrieveAccounts,
    addAccount,
    updateAccount,
    removeAccount,
    removeAccountBalance,
};
export default AccountsService;
