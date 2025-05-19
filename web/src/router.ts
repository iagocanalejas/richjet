import { createRouter, createWebHistory } from 'vue-router';
import PortfolioView from './views/PortfolioView.vue';
import { useAuthStore } from './stores/auth';

const router = createRouter({
    history: createWebHistory(import.meta.env.VITE_VUE_BASE_URL),
    routes: [
        {
            path: '/',
            name: 'portfolio',
            component: PortfolioView,
        },
        {
            path: '/shares',
            name: 'shares',
            component: () => import('./views/SharesView.vue'),
        },
        {
            path: '/transactions',
            name: 'transactions',
            component: () => import('./views/TransactionsView.vue'),
        },
        {
            path: '/privacy-policy',
            name: 'privacy-policy',
            component: () => import('./views/legal/PrivacyPolicyView.vue'),
        },
        {
            path: '/conditions',
            name: 'conditions',
            component: () => import('./views/legal/ConditionsView.vue'),
        },
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

export default router;
