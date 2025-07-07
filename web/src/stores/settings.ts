import type { Settings, Account, SubscriptionPlan } from '@/types/user';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import AccountsService from './api/accounts';
import UsersService from './api/users';
import StocksService from './api/stocks';
import StripeService from './api/stripe';

export const useSettingsStore = defineStore('settings', () => {
    const _settings = ref<Settings>({ currency: 'USD', accounts: [] });
    const conversionRate = ref<number>(1.0);
    const account = ref<Account | undefined>();
    const subscription_plans = ref<SubscriptionPlan[]>([]);

    const currency = computed({
        get() {
            return _settings.value.currency;
        },
        async set(currency: string) {
            _settings.value.currency = currency;
            await _updateCurrency();
            await _getConvertionRate(currency);
        },
    });

    const accounts = computed(() => _settings.value.accounts);

    async function init() {
        const [settings, accounts] = await Promise.all([
            UsersService.getUserSettings(),
            AccountsService.retrieveAccounts(),
        ]);

        _settings.value = { ..._settings.value, ...settings, accounts: accounts };
    }

    async function loadPlans() {
        if (subscription_plans.value.length > 0) return;
        const data = await StripeService.getPlans(_settings.value.currency);
        if (!data) return;
        subscription_plans.value = data;
    }

    async function createAccount(a: Account) {
        const newAccount = await AccountsService.addAccount(a);
        if (!newAccount) return;
        _settings.value.accounts.push(newAccount);
        account.value = newAccount;
    }

    async function updateAccount(a: Account) {
        const updatedAccount = await AccountsService.updateAccount(a);
        if (!updatedAccount) return;
        const index = _settings.value.accounts.findIndex((acc) => acc.id === a.id);
        _settings.value.accounts[index] = updatedAccount;
        account.value = updatedAccount;
    }

    async function deleteAccount(accountId: string) {
        const deleted = await AccountsService.removeAccount(accountId);
        if (!deleted) return;
        _settings.value.accounts = _settings.value.accounts.filter((a) => a.id !== accountId);
        if (account.value?.id === accountId) {
            account.value = undefined;
        }
    }

    async function subscribe(plan: SubscriptionPlan) {
        const session = await StripeService.getCheckoutSession(plan.id);
        if (!session) return;
        window.location.href = session.url;
    }

    async function updateSubscriptionStatus(cancelAtPeriodEnd: boolean) {
        if (!_settings.value.subscription || !_settings.value.subscription.id) return;
        const subscription = await StripeService.updateSubscriptionStatus(
            _settings.value.subscription.id,
            cancelAtPeriodEnd
        );
        if (!subscription) return;
        _settings.value.subscription = {
            ...subscription,
            plan: { ...subscription.plan, product: { ..._settings.value.subscription.plan.product } },
        };
    }

    async function _updateCurrency() {
        await UsersService.updateUserCurrency(_settings.value.currency);
    }

    async function _getConvertionRate(currency: string) {
        if (currency === 'USD') {
            conversionRate.value = 1.0;
            return;
        }

        const conversion = await StocksService.retrieveConversionRate(currency);
        conversionRate.value = conversion || 1.0;
    }

    return {
        init,
        settings: _settings,
        currency,
        conversionRate,
        accounts,
        account,
        subscription_plans,
        loadPlans,
        createAccount,
        updateAccount,
        deleteAccount,
        subscribe,
        updateSubscriptionStatus,
    };
});
