import { safeFetch } from './_utils';
import type { SubscriptionPlan, Subscription } from '@/types/user';

const BASE_URL = import.meta.env.VITE_BACKEND_BASE_URL || '/api';

async function getPlans(currency: string) {
    const f = fetch(`${BASE_URL}/checkout/plans/${currency}`, { method: 'GET', credentials: 'include' });
    return safeFetch<SubscriptionPlan[]>(f, 'Error fetching subscription plans');
}

function getCheckoutSession(planId: string) {
    const f = fetch(`${BASE_URL}/checkout/${planId}`, { method: 'GET', credentials: 'include' });
    return safeFetch<{ session_id: string; url: string }>(f, 'Error starting checkout');
}

function updateSubscriptionStatus(subscriptionId: string, cancelAtPeriodEnd = false) {
    const f = fetch(`${BASE_URL}/checkout/${subscriptionId}/${cancelAtPeriodEnd ? 'cancel' : 'enable'}`, {
        method: 'PUT',
        credentials: 'include',
    });
    return safeFetch<Subscription>(f, 'Error canceling subscription');
}

const StripeService = {
    getPlans,
    getCheckoutSession,
    updateSubscriptionStatus,
};
export default StripeService;
