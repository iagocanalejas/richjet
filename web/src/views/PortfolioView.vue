<template>
    <main class="justify-center min-h-[calc(100vh-144px)] bg-gray-900 text-white p-6">
        <div class="flex flex-col justify-center items-center w-full max-w-2xl mx-auto">
            <PortfolioTotalsComponent @create="isAccountBalanceModalOpen = true" />
        </div>
        <div
            v-if="!isSavingsAccount(selectedAccount)"
            class="mt-6 flex flex-col justify-center items-center w-full max-w-2xl mx-auto"
        >
            <LoadingSpinner />
            <PortfolioListComponent />
        </div>

        <div
            v-if="isSavingsAccount(selectedAccount)"
            class="mt-6 flex flex-col justify-center items-center w-full max-w-2xl mx-auto"
        >
            <PortfolioAccountBalancesComponent
                :account="selectedAccount!"
                @create="isAccountBalanceModalOpen = true"
                @delete-balance="settingsStore.deleteAccountBalance"
            />
        </div>

        <button
            v-if="manualPrices.length > 0"
            @click="isBulkManualPriceUpdateModalOpen = true"
            class="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 rounded-full shadow-lg flex items-center justify-center hover:bg-blue-700 transition-colors"
        >
            <svg
                xmlns="http://www.w3.org/2000/svg"
                class="w-6 h-6 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
            >
                <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M16.862 3.487a2.25 2.25 0 013.182 3.182L7.5 19.212 3 21l1.788-4.5L16.862 3.487z"
                />
            </svg>
        </button>
    </main>

    <BulkManualPriceModal
        v-if="isBulkManualPriceUpdateModalOpen && manualPrices.length > 0"
        :values="manualPrices"
        @save="bulkUpdateManualPrices"
        @close="isBulkManualPriceUpdateModalOpen = false"
    />

    <AccountBalanceModal
        v-if="isSavingsAccount(selectedAccount) && isAccountBalanceModalOpen"
        :account="selectedAccount!"
        @save="saveAccount"
        @close="isAccountBalanceModalOpen = false"
    />
</template>

<script setup lang="ts">
import LoadingSpinner from '@/components/LoadingSpinner.vue';
import AccountBalanceModal from '@/components/modals/AccountBalanceModal.vue';
import BulkManualPriceModal from '@/components/modals/BulkManualPriceModal.vue';
import PortfolioAccountBalancesComponent from '@/components/portfolio/PortfolioAccountBalancesComponent.vue';
import PortfolioListComponent from '@/components/portfolio/PortfolioListComponent.vue';
import PortfolioTotalsComponent from '@/components/portfolio/PortfolioTotalsComponent.vue';
import { usePortfolioStore } from '@/stores/portfolio';
import { useSettingsStore } from '@/stores/settings';
import { useTransactionsStore } from '@/stores/transactions';
import type { Account } from '@/types/user';
import { isPortfolioItemWithManualPrice, isSavingsAccount } from '@/utils/rules';
import { storeToRefs } from 'pinia';
import { computed, ref } from 'vue';

const settingsStore = useSettingsStore();
const { account: selectedAccount } = storeToRefs(settingsStore);
const { portfolio } = storeToRefs(usePortfolioStore());

const manualPrices = computed(() => portfolio.value.filter((i) => i.quantity > 0 && isPortfolioItemWithManualPrice(i)));

const isAccountBalanceModalOpen = ref(false);
const isBulkManualPriceUpdateModalOpen = ref(false);

function saveAccount(account: Account) {
    isAccountBalanceModalOpen.value = false;
    settingsStore.updateAccount(account);
}

function bulkUpdateManualPrices(values: { symbol_id: string; price: number }[]) {
    isBulkManualPriceUpdateModalOpen.value = false;
    useTransactionsStore().bulkUpdateManualPrices(values);
}
</script>
