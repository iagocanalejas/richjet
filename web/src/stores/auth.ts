import { type User } from '@/types/user';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

export const useAuthStore = defineStore('auth-store', () => {
    const user = ref<User>();

    const isLogged = computed(() => !!user.value);

    async function init() {
        await _retrieveUser();
    }

    async function logout() {
        await fetch('/api/auth/logout', { method: 'GET', credentials: 'include' });
        user.value = undefined;
    }

    async function handleOAuthCallback(code: string, state: string) {
        await fetch(`/api/auth/callback?code=${code}&state=${state}`, { method: 'GET' });
        return await _retrieveUser();
    }

    async function _retrieveUser() {
        const res = await fetch('/api/auth/me', { method: 'GET', credentials: 'include' });
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

    return { user, isLogged, init, logout, handleOAuthCallback };
});
