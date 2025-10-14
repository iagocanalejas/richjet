import { type Settings, type Account, type SubscriptionPlan, DEFAULT_SETTINGS } from '@/types/user';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import AccountsService from './api/accounts';
import UsersService from './api/users';
import StocksService from './api/stocks';
import StripeService from './api/stripe';

export const useSettingsStore = defineStore('settings', () => {
    const _settings = ref<Settings>(DEFAULT_SETTINGS);
    const account = ref<Account | undefined>();
    const subscriptionPlans = ref<SubscriptionPlan[]>([]);

    const currency = computed({
        get() {
            return _settings.value.currency;
        },
        async set(currency: string) {
            _settings.value.currency = currency;
            await _updateCurrency();
        },
    });

    const accounts = computed(() => _settings.value.accounts);

    const _conversionCache = new Map<string, number>();

    async function init() {
        const [settings, accounts] = await Promise.all([
            UsersService.getUserSettings(),
            AccountsService.retrieveAccounts(),
        ]);

        if (accounts.length === 1) {
            account.value = accounts[0];
        }

        _settings.value = { ..._settings.value, ...settings, accounts: accounts };
        for (const cur of new Set(accounts.map((a) => a.currency))) {
            await loadConvertionRate(cur);
        }
    }

    async function loadPlans() {
        if (subscriptionPlans.value.length > 0) return;
        const data = await StripeService.getPlans(_settings.value.currency);
        if (!data) return;
        subscriptionPlans.value = data;
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

    async function deleteAccount(accountId: string, forced = false) {
        const deleted = await AccountsService.removeAccount(accountId, forced);
        if (!deleted) return;
        _settings.value.accounts = _settings.value.accounts.filter((a) => a.id !== accountId);
        if (account.value?.id === accountId) {
            account.value = undefined;
        }
    }

    async function deleteAccountBalance(accountId: string, balanceId: string) {
        const updated_account = await AccountsService.removeAccountBalance(accountId, balanceId);
        if (!updated_account) return;
        const index = _settings.value.accounts.findIndex((acc) => acc.id === accountId);
        if (index === -1) return;
        _settings.value.accounts[index] = updated_account;
        account.value = updated_account;
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

    async function loadConvertionRate(from_currency: string, to_currency?: string) {
        if (!to_currency) to_currency = _settings.value.currency;
        if (from_currency === to_currency) return;

        const cacheKey = `${from_currency}:${to_currency}`;
        if (_conversionCache.has(cacheKey)) return;

        const conversion = await StocksService.retrieveConversionRate(from_currency, to_currency);
        if (conversion) _conversionCache.set(cacheKey, conversion);
    }

    function toCurrency(amount: number | undefined, from_currency: string) {
        if (!amount) return 0.0;
        if (from_currency === _settings.value.currency) return amount;
        const rate = _conversionCache.get(`${from_currency}:${_settings.value.currency}`) ?? 1.0;
        return amount * rate;
    }

    async function _updateCurrency() {
        await UsersService.updateUserCurrency(_settings.value.currency);
    }

    return {
        init,
        settings: _settings,
        currency,
        accounts,
        account,
        subscriptionPlans,
        loadPlans,
        loadConvertionRate,
        toCurrency,
        createAccount,
        updateAccount,
        deleteAccount,
        deleteAccountBalance,
        subscribe,
        updateSubscriptionStatus,
    };
});
