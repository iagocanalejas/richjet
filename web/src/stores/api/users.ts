import type { Settings, User } from '@/types/user';
import { useErrorsStore, type CustomError } from '../errors';

const BASE_URL = import.meta.env.VITE_BACKEND_BASE_URL || '/api';

const addError = (e: CustomError) => useErrorsStore().addError(e);

async function loadUser() {
    const url = `${BASE_URL}/auth/me`;
    const res = await fetch(url, { method: 'GET', credentials: 'include' });
    if (!res.ok) {
        if (res.status === 401) return;
        addError({
            readable_message: 'Failed to load user',
            trace: { status: res.status, statusText: res.statusText, url: res.url },
        });
        return;
    }
    return (await res.json()) as User;

    // HACK: Let errors bubble up as this is the main entry point we need to use to handle server wake up/
}

async function getUserSettings() {
    const url = `${BASE_URL}/users/settings`;
    try {
        const res = await fetch(url, { method: 'GET', credentials: 'include' });
        if (!res.ok) {
            addError({
                readable_message: 'Failed to fetch user settings',
                trace: { status: res.status, statusText: res.statusText, url: res.url },
            });
            return;
        }
        return (await res.json()) as Settings;
    } catch (err) {
        addError({
            readable_message: 'Failed to fetch user settings',
            trace: {
                status: err instanceof Error ? err.message : String(err),
                url: url,
            },
        });
    }
}

async function updateUserCurrency(currency: string) {
    const url = `${BASE_URL}/users/settings`;
    try {
        const res = await fetch(url, {
            method: 'PUT',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ currency }),
        });
        if (!res.ok) {
            addError({
                readable_message: 'Error updating user settings',
                trace: { status: res.status, statusText: res.statusText, url: res.url },
            });
            return;
        }
        return (await res.json()) as Settings;
    } catch (err) {
        addError({
            readable_message: 'Error updating user settings',
            trace: {
                status: err instanceof Error ? err.message : String(err),
                url: url,
            },
        });
        return;
    }
}

const UsersService = {
    loadUser,
    getUserSettings,
    updateUserCurrency,
};
export default UsersService;
