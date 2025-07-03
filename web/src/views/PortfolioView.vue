<template>
    <main class="justify-center min-h-[calc(100vh-72px)] bg-gray-900 text-white p-6">
        <div class="flex flex-col justify-center items-center w-full max-w-2xl mx-auto">
            <PortfolioTotalsComponent />
        </div>
        <div
            v-if="!isSavingsAccount(selectedAccount)"
            class="mt-6 flex flex-col justify-center items-center w-full max-w-2xl mx-auto"
        >
            <LoadingSpinner />
            <PortfolioListComponent />
        </div>
    </main>
</template>

<script setup lang="ts">
import LoadingSpinner from '@/components/LoadingSpinner.vue';
import PortfolioListComponent from '@/components/portfolio/PortfolioListComponent.vue';
import PortfolioTotalsComponent from '@/components/portfolio/PortfolioTotalsComponent.vue';
import { useSettingsStore } from '@/stores/settings';
import { isSavingsAccount } from '@/utils/rules';
import { storeToRefs } from 'pinia';

// TODO: display account balance history
const { account: selectedAccount } = storeToRefs(useSettingsStore());
</script>
