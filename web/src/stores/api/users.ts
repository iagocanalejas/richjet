import type { Settings, User } from '@/types/user';
import { useErrorsStore, type CustomError } from '../errors';
import { safeFetch } from './_utils';

const BASE_URL = import.meta.env.VITE_BACKEND_BASE_URL || '/api';

const addError = (e: CustomError) => useErrorsStore().addError(e);

async function loadUser() {
    const url = `${BASE_URL}/auth/me`;
    const res = await fetch(url, { method: 'GET', credentials: 'include' });
    if (!res.ok) {
        if (res.status === 401) return;
        const err = await res.json();
        addError({
            readable_message: err.detail ?? 'Failed to load user',
            trace: { status: res.status, statusText: res.statusText, url: res.url },
        });
        return;
    }
    return (await res.json()) as User;

    // HACK: Let errors bubble up as this is the main entry point we need to use to handle server wake up/
}

function getUserSettings() {
    const f = fetch(`${BASE_URL}/users/settings`, { method: 'GET', credentials: 'include' });
    return safeFetch<Settings>(f, 'Failed to fetch user settings');
}

function updateUserCurrency(currency: string) {
    const f = fetch(`${BASE_URL}/users/settings`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currency }),
    });
    return safeFetch<Settings>(f, 'Error updating user settings');
}

const UsersService = {
    loadUser,
    getUserSettings,
    updateUserCurrency,
};
export default UsersService;
