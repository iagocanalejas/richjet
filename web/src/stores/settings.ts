import type { Settings, Account } from '@/types/user';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

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
            fetch('/api/users/settings', { method: 'GET', credentials: 'include' }),
            fetch('/api/accounts', { method: 'GET', credentials: 'include' }),
        ]);
        if (!settings.ok) throw new Error('Error fetching settings');
        if (!accounts.ok) throw new Error('Error fetching accounts');
        _settings.value = { ..._settings.value, ...(await settings.json()), accounts: await accounts.json() };
        await _getConvertionRate(_settings.value.currency);
    }

    async function createAccount(a: Account) {
        const res = await fetch('/api/accounts', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(a),
        });
        if (!res.ok) throw new Error('Network response was not ok');
        const newAccount = await res.json();
        _settings.value.accounts.push(newAccount);
        account.value = newAccount;
    }

    async function _updateCurrency() {
        const res = await fetch('/api/users/settings', {
            method: 'PUT',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ currency: _settings.value.currency }),
        });
        if (!res.ok) throw new Error('Network response was not ok');
    }

    async function _getConvertionRate(currency: string) {
        if (currency === 'USD') {
            conversionRate.value = 1.0;
            return;
        }
        try {
            const response = await fetch(`/api/exchangerate/${currency}`, { method: 'GET' });
            if (!response.ok) throw new Error('Network response was not ok');

            const data = await response.json();
            conversionRate.value = data.conversion_rate;
        } catch (error) {
            console.error('Error fetching conversion rate:', error);
        }
    }

    return {
        init,
        settings: _settings,
        currency,
        conversionRate,
        accounts,
        account,
        createAccount,
    };
});
