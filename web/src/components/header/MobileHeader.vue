<template>
    <div v-if="isLogged" class="flex items-center md:hidden ml-auto">
        <AccountSelector
            :accounts="accounts"
            :selected="selectedAccount"
            :max-accounts="settings?.limits?.max_accounts ?? 0"
            @select="selectedAccount = $event"
            @create="createAccount"
            @delete="deleteAccount($event.id, true)"
        />

        <CurrencySelector :selected="currency" @select="currency = $event" />
    </div>

    <button @click="mobileOpen = !mobileOpen" class="md:hidden text-white focus:outline-none ml-auto">
        <svg
            v-if="!mobileOpen"
            xmlns="http://www.w3.org/2000/svg"
            class="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
        >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
        <svg
            v-else
            xmlns="http://www.w3.org/2000/svg"
            class="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
        >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
    </button>

    <div ref="dropdown">
        <div
            v-if="mobileOpen"
            class="absolute top-16 left-0 w-full bg-gray-800 text-white shadow-md p-4 flex flex-col space-y-3 md:hidden z-50"
        >
            <RouterLink
                v-if="isLogged"
                to="/"
                class="block px-3 py-2 rounded-lg transition duration-200 hover:bg-gray-700 hover:text-gray-300"
                active-class="bg-gray-700 text-gray-300"
                exact
                @click="mobileOpen = false"
            >
                Portfolio
            </RouterLink>
            <RouterLink
                v-if="isLogged"
                to="/shares"
                class="block px-3 py-2 rounded-lg transition duration-200 hover:bg-gray-700 hover:text-gray-300"
                active-class="bg-gray-700 text-gray-300"
                @click="mobileOpen = false"
            >
                Shares
            </RouterLink>
            <RouterLink
                v-if="isLogged"
                to="/transactions"
                class="block px-3 py-2 rounded-lg transition duration-200 hover:bg-gray-700 hover:text-gray-300"
                active-class="bg-gray-700 text-gray-300"
                @click="mobileOpen = false"
            >
                Transactions
            </RouterLink>
        </div>
    </div>
</template>
<script setup lang="ts">
import { RouterLink } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useAuthStore } from '@/stores/auth';
import { useSettingsStore } from '@/stores/settings';
import { onBeforeUnmount, onMounted, ref } from 'vue';
import AccountSelector from '../utils/AccountSelector.vue';
import CurrencySelector from '../utils/CurrencySelector.vue';

const authStore = useAuthStore();
const settingsStore = useSettingsStore();
const { isLogged } = storeToRefs(authStore);
const { currency, accounts, account: selectedAccount, settings } = storeToRefs(settingsStore);
const { createAccount, deleteAccount } = settingsStore;

const mobileOpen = ref(false);
const dropdown = ref<HTMLElement | null>(null);

function handleClickOutside(event: MouseEvent) {
    if (dropdown.value && !dropdown.value.contains(event.target as Node)) {
        mobileOpen.value = false;
    }
}

onMounted(() => {
    document.addEventListener('click', handleClickOutside);
});

onBeforeUnmount(() => {
    document.removeEventListener('click', handleClickOutside);
});
</script>
