import { createRouter, createWebHistory } from 'vue-router';
import PortfolioView from './views/PortfolioView.vue';
import { useAuthStore } from './stores/auth';
import { useSettingsStore } from './stores/settings';

const router = createRouter({
    history: createWebHistory(import.meta.env.VITE_VUE_BASE_URL),
    routes: [
        { path: '/', name: 'portfolio', component: PortfolioView },
        { path: '/shares', name: 'shares', component: () => import('./views/SharesView.vue') },
        { path: '/transactions', name: 'transactions', component: () => import('./views/TransactionsView.vue') },
        {
            path: '/settings',
            name: 'settings',
            component: () => import('./views/SettingsView.vue'),
            beforeEnter: async () => {
                if (!useAuthStore().isLogged) return { name: 'portfolio' };
                await useSettingsStore().loadPlans();
            },
        },
        {
            path: '/privacy-policy',
            name: 'privacy-policy',
            component: () => import('./views/legal/PrivacyPolicyView.vue'),
        },
        { path: '/conditions', name: 'conditions', component: () => import('./views/legal/ConditionsView.vue') },
        { path: '/checkout-success', name: 'checkout-success', component: () => PortfolioView },
        { path: '/checkout-cancel', name: 'checkout-cancel', component: () => PortfolioView },
        {
            path: '/auth/callback',
            name: 'auth-callback',
            beforeEnter: async (to, _, next) => {
                const code = to.query.code as string | undefined;
                const state = to.query.state as string | undefined;

                if (!code || !state) {
                    console.error('No OAuth code in callback URL');
                    return next('/');
                }

                await useAuthStore().handleOAuthCallback(code, state);
                return next('/');
            },
            component: () => PortfolioView,
        },
    ],
});

let initialized = false;
router.beforeEach(async (to, __, next) => {
    if (to.name === 'auth-callback') return next();
    if (!initialized) {
        const authStore = useAuthStore();
        await authStore.init();
        if (!authStore.isLogged) return next();

        await useSettingsStore().init();
        initialized = true;
    }
    next();
});

export default router;
