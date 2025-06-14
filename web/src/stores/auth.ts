import { type User } from '@/types/user';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

export const useAuthStore = defineStore('auth-store', () => {
    const BASE_URL = import.meta.env.VITE_BACKEND_BASE_URL || '/api';

    const user = ref<User>();
    const isLogged = computed(() => !!user.value);

    async function init() {
        await _retrieveUser();
    }

    async function login() {
        const res = await fetch(`${BASE_URL}/auth/login`, { method: 'GET', credentials: 'include' });
        const { auth_url } = await res.json();
        window.location.href = auth_url;
    }

    async function logout() {
        await fetch(`${BASE_URL}/auth/logout`, { method: 'GET', credentials: 'include' });
        user.value = undefined;
    }

    async function handleOAuthCallback(code: string, state: string) {
        const res = await fetch(`${BASE_URL}/auth/callback?code=${code}&state=${state}`, {
            method: 'GET',
            credentials: 'include',
        });
        if (!res.ok) throw new Error('Network response was not ok');
        const data = await res.json();
        window.location.href = data.redirect_url;
        return await _retrieveUser();
    }

    async function _retrieveUser() {
        const res = await fetch(`${BASE_URL}/auth/me`, { method: 'GET', credentials: 'include' });
        if (!res.ok) {
            if (res.status === 401) {
                user.value = undefined;
                return;
            }
            throw new Error('Network response was not ok');
        }
        user.value = await res.json();
        return user.value;
    }

    return { user, isLogged, init, login, logout, handleOAuthCallback };
});
