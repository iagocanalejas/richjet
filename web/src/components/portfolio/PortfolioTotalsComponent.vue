<template>
    <section
        class="p-6 bg-gray-800 rounded-xl shadow-md text-white grid gap-4"
        :class="gridClass()"
        @click="isAccountBalanceModalOpen = true"
    >
        <div v-if="isSavingsAccount(selectedAccount)" class="text-center">
            <h2 class="text-sm font-medium text-gray-400">Account Name</h2>
            <p class="text-lg font-semibold text-white">
                {{ selectedAccount!.name }}
            </p>
        </div>
        <div v-if="isSavingsAccount(selectedAccount)" class="text-center">
            <h2 class="text-sm font-medium text-gray-400">Balance</h2>
            <p class="text-lg font-semibold text-white">
                {{ formatCurrency(selectedAccount!.balance!, currency) }}
            </p>
        </div>

        <div v-if="!isSavingsAccount(selectedAccount)" class="text-center">
            <h2 class="text-sm font-medium text-gray-400">Invested</h2>
            <p class="text-lg font-semibold text-white">
                {{ formatCurrency(totalInvested, currency) }}
            </p>
        </div>
        <div v-if="!isSavingsAccount(selectedAccount)" class="text-center">
            <h2 class="text-sm font-medium text-gray-400">Current</h2>
            <p class="text-lg font-semibold" :class="textColorByRentability(portfolioCurrentValue - totalInvested)">
                {{ formatCurrency(portfolioCurrentValue, currency) }}
            </p>
        </div>
        <div v-if="!selectedAccount" class="text-center">
            <h2 class="text-sm font-medium text-gray-400">Savings</h2>
            <p class="text-lg font-semibold" :class="textColorByRentability(portfolioCurrentValue - totalInvested)">
                {{ formatCurrency(savingAccountsValue, currency) }}
            </p>
        </div>
        <div v-if="!isSavingsAccount(selectedAccount)" class="text-center">
            <h2 class="text-sm font-medium text-gray-400">Closed</h2>
            <p class="text-lg font-semibold" :class="textColorByRentability(closedPositions)">
                {{ formatCurrency(closedPositions, currency) }}
            </p>
        </div>
        <div v-if="!isSavingsAccount(selectedAccount)" class="text-center">
            <h2 class="text-sm font-medium text-gray-400">Dividends</h2>
            <p class="text-lg font-semibold text-green-400">
                {{ formatCurrency(cashDividends, currency) }}
            </p>
        </div>
        <div v-if="!isSavingsAccount(selectedAccount)" class="text-center">
            <h2 class="text-sm font-medium text-gray-400">Rentability</h2>
            <p class="text-lg font-semibold" :class="textColorByRentability(rentability)">
                {{ rentability.toFixed(2) }}%
            </p>
        </div>
    </section>

    <AccountBalanceModal
        v-if="isSavingsAccount(selectedAccount) && isAccountBalanceModalOpen"
        :account="selectedAccount!"
        @save="save"
        @close="isAccountBalanceModalOpen = false"
    />
</template>

<script lang="ts" setup>
import { usePortfolioStore } from '@/stores/portfolio';
import { useSettingsStore } from '@/stores/settings';
import { formatCurrency } from '@/utils/utils';
import { textColorByRentability } from '@/utils/styles';
import { storeToRefs } from 'pinia';
import { isSavingsAccount } from '@/utils/rules';
import AccountBalanceModal from '../modals/AccountBalanceModal.vue';
import { ref } from 'vue';
import type { Account } from '@/types/user';

const settingsStore = useSettingsStore();
const { currency, account: selectedAccount } = storeToRefs(settingsStore);
const { updateAccount } = settingsStore;
const { cashDividends, totalInvested, portfolioCurrentValue, savingAccountsValue, closedPositions, rentability } =
    storeToRefs(usePortfolioStore());

const isAccountBalanceModalOpen = ref(false);

function gridClass() {
    if (!selectedAccount.value) return 'grid-cols-3 md:grid-cols-6';
    if (isSavingsAccount(selectedAccount.value)) return 'grid-cols-2 cursor-pointer';
    return 'grid-cols-3 md:grid-cols-5';
}

function save(account: Account) {
    isAccountBalanceModalOpen.value = false;
    updateAccount(account);
}
</script>
