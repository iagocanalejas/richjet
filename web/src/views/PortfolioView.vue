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
    </main>

    <AccountBalanceModal
        v-if="isSavingsAccount(selectedAccount) && isAccountBalanceModalOpen"
        :account="selectedAccount!"
        @save="save"
        @close="isAccountBalanceModalOpen = false"
    />
</template>

<script setup lang="ts">
import LoadingSpinner from '@/components/LoadingSpinner.vue';
import AccountBalanceModal from '@/components/modals/AccountBalanceModal.vue';
import PortfolioAccountBalancesComponent from '@/components/portfolio/PortfolioAccountBalancesComponent.vue';
import PortfolioListComponent from '@/components/portfolio/PortfolioListComponent.vue';
import PortfolioTotalsComponent from '@/components/portfolio/PortfolioTotalsComponent.vue';
import { useSettingsStore } from '@/stores/settings';
import type { Account } from '@/types/user';
import { isSavingsAccount } from '@/utils/rules';
import { storeToRefs } from 'pinia';
import { ref } from 'vue';

const settingsStore = useSettingsStore();
const { account: selectedAccount } = storeToRefs(settingsStore);

const isAccountBalanceModalOpen = ref(false);

function save(account: Account) {
    isAccountBalanceModalOpen.value = false;
    settingsStore.updateAccount(account);
}
</script>
