import { type User } from '@/types/user';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import AuthService from './api/auth';
import UsersService from './api/users';

export const useAuthStore = defineStore('auth-store', () => {
    const user = ref<User>();
    const isLogged = computed(() => !!user.value);

    async function init() {
        user.value = await UsersService.loadUser();
    }

    async function login() {
        const auth_url = await AuthService.login();
        window.location.href = auth_url ?? '/';
    }

    async function logout() {
        await AuthService.logout();
        user.value = undefined;
    }

    async function handleOAuthCallback(code: string, state: string) {
        const redirect_url = await AuthService.handleOAuthCallback(code, state);
        window.location.href = redirect_url ?? '/';
        user.value = await UsersService.loadUser();
    }

    return { user, isLogged, init, login, logout, handleOAuthCallback };
});
