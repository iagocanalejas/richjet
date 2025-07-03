import { useErrorsStore, type CustomError } from '../errors';

const BASE_URL = import.meta.env.VITE_BACKEND_BASE_URL || '/api';

const addError = (e: CustomError) => useErrorsStore().addError(e);

// NOTE: Don't use safeFetch in this module.

async function login() {
    const url = `${BASE_URL}/auth/login`;
    try {
        const res = await fetch(url, { method: 'GET', credentials: 'include' });
        if (!res.ok) {
            addError({
                readable_message: 'Error retrieving login URL',
                trace: { status: res.status, statusText: res.statusText, url: res.url },
            });
            return;
        }
        const { auth_url } = await res.json();
        return auth_url as string;
    } catch (err) {
        addError({
            readable_message: 'Error retrieving login URL',
            trace: {
                status: err instanceof Error ? err.message : String(err),
                url: url,
            },
        });
    }
}

async function logout() {
    const url = `${BASE_URL}/auth/logout`;
    try {
        await fetch(url, { method: 'GET', credentials: 'include' });
    } catch {
        // ignore errors during logout
    }
}

async function handleOAuthCallback(code: string, state: string) {
    const url = `${BASE_URL}/auth/callback?code=${code}&state=${state}`;
    try {
        const res = await fetch(url, { method: 'GET', credentials: 'include' });
        if (!res.ok) {
            addError({
                readable_message: 'Error during OAuth callback',
                trace: { status: res.status, statusText: res.statusText, url: res.url },
            });
            return;
        }
        const { redirect_url } = await res.json();
        return redirect_url as string;
    } catch (err) {
        addError({
            readable_message: 'Error during OAuth callback',
            trace: {
                status: err instanceof Error ? err.message : String(err),
                url: url,
            },
        });
    }
}

const AuthService = {
    login,
    logout,
    handleOAuthCallback,
};
export default AuthService;
