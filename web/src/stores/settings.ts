import type { Settings, Account } from '@/types/user';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import AccountsService from './api/accounts';
import UsersService from './api/users';
import StocksService from './api/stocks';

export const useSettingsStore = defineStore('settings', () => {
    const _settings = ref<Settings>({ currency: 'USD', accounts: [] });
    const conversionRate = ref<number>(1.0);
    const account = ref<Account | undefined>();

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

    async function createAccount(a: Account) {
        const newAccount = await AccountsService.addAccount(a);
        if (!newAccount) return;
        _settings.value.accounts.push(newAccount);
        account.value = newAccount;
    }

    async function deleteAccount(accountId: string) {
        const deleted = await AccountsService.removeAccount(accountId);
        if (!deleted) return;
        _settings.value.accounts = _settings.value.accounts.filter((a) => a.id !== accountId);
        if (account.value?.id === accountId) {
            account.value = undefined;
        }
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
        createAccount,
        deleteAccount,
    };
});
