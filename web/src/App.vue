<template>
    <header class="flex items-center justify-between p-4 bg-gray-800 text-white shadow-md">
        <RouterLink to="/" class="flex items-center space-x-2 hover:opacity-80 transition">
            <img src="@/assets/logo.png" alt="Logo" class="h-10 w-10" />
            <span class="text-xl font-semibold text-white">RichJet</span>
        </RouterLink>
        <nav class="flex space-x-4 ml-auto">
            <RouterLink
                v-if="isLogged"
                to="/"
                class="px-3 py-2 rounded-lg transition duration-200 hover:bg-gray-700 hover:text-gray-300"
                active-class="bg-gray-700 text-gray-300"
                exact
            >
                Portfolio
            </RouterLink>
            <RouterLink
                v-if="isLogged"
                to="/shares"
                class="px-3 py-2 rounded-lg transition duration-200 hover:bg-gray-700 hover:text-gray-300"
                active-class="bg-gray-700 text-gray-300"
            >
                Shares
            </RouterLink>
            <RouterLink
                v-if="isLogged"
                to="/transactions"
                class="px-3 py-2 rounded-lg transition duration-200 hover:bg-gray-700 hover:text-gray-300"
                active-class="bg-gray-700 text-gray-300"
            >
                Transactions
            </RouterLink>

            <AccountSelector
                v-if="isLogged"
                :accounts="accounts"
                :selected="selectedAccount"
                :max-accounts="settings?.limits?.max_accounts ?? 0"
                @select="selectedAccount = $event"
                @create="createAccount"
                @delete="deleteAccount($event.id, true)"
            />

            <div v-if="isLogged" class="relative">
                <select
                    v-model="currency"
                    class="appearance-none bg-gray-700 text-white pl-8 py-2 rounded-lg pr-8 focus:outline-none focus:ring-2 focus:ring-gray-500 cursor-pointer"
                >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                </select>
            </div>

            <div class="relative" v-if="user?.picture">
                <img
                    :src="user.picture"
                    alt="User"
                    class="w-10 h-10 rounded-full object-cover border-2 border-blue-400 cursor-pointer"
                    @click="showMenu = !showMenu"
                />
                <div
                    v-if="showMenu"
                    class="absolute right-0 mt-2 w-50 bg-gray-800 text-white rounded-lg shadow-lg z-50 border border-gray-700"
                >
                    <button
                        @click="goToSettings"
                        class="block w-full text-left px-4 py-2 hover:bg-gray-700 rounded-b-lg transition"
                    >
                        Manage Subscription
                    </button>
                    <button
                        @click="signOut"
                        class="block w-full text-left px-4 py-2 hover:bg-gray-700 rounded-b-lg transition"
                    >
                        Sign out
                    </button>
                </div>
            </div>

            <div v-else>
                <button
                    @click="signIn"
                    class="flex items-center gap-2 bg-white text-gray-700 px-3 py-3 rounded-full shadow hover:shadow-md transition hover:bg-gray-100"
                >
                    <img
                        src="https://developers.google.com/identity/images/g-logo.png"
                        alt="Google logo"
                        class="w-5 h-5"
                    />
                </button>
            </div>
        </nav>
    </header>

    <LoadingBar v-if="isLoading" />
    <WakingUpModal v-if="!isFirstLoadCompleted" />

    <LandingView v-if="!isLogged" @sign-in="signIn" />
    <RouterView v-else />

    <ErrorsModal v-if="isShowingErrorsModal" />

    <footer class="bg-gray-900 text-gray-400 py-6">
        <div class="max-w-6xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4">
            <p class="text-sm">&copy; {{ currentYear }}. All rights reserved.</p>
            <nav class="flex space-x-4">
                <RouterLink to="/privacy-policy" class="hover:text-gray-200 transition">Privacy Policy</RouterLink>
                <RouterLink to="/conditions" class="hover:text-gray-200 transition">Terms & Conditions</RouterLink>
            </nav>
        </div>
    </footer>
</template>

<script setup lang="ts">
import { RouterLink, RouterView, useRouter } from 'vue-router';
import { useSettingsStore } from './stores/settings';
import { storeToRefs } from 'pinia';
import { onMounted, ref, watch } from 'vue';
import { useWatchlistStore } from './stores/watchlist';
import { useAuthStore } from './stores/auth';
import LoadingBar from './components/LoadingBar.vue';
import LandingView from './views/LandingView.vue';
import AccountSelector from './components/utils/AccountSelector.vue';
import ErrorsModal from './components/modals/ErrorsModal.vue';
import { useErrorsStore } from './stores/errors';
import WakingUpModal from './components/modals/WakingUpModal.vue';
import { useLoadingStore } from './stores/loading';
import { useTransactionsStore } from './stores/transactions';

const router = useRouter();
const authStore = useAuthStore();
const settingsStore = useSettingsStore();
const { user, isLogged } = storeToRefs(authStore);
const { currency, accounts, account: selectedAccount, settings } = storeToRefs(settingsStore);
const { createAccount, deleteAccount } = settingsStore;
const { isLoading, isFirstLoadCompleted } = storeToRefs(useLoadingStore());
const { hasErrors: isShowingErrorsModal } = storeToRefs(useErrorsStore());
const currentYear = new Date().getFullYear();

const showMenu = ref(false);

function signIn() {
    authStore.login();
}

function signOut(): void {
    authStore.logout();
    showMenu.value = false;
}

function goToSettings() {
    router.push('/settings');
    showMenu.value = false;
}

watch(
    () => isLogged.value,
    async (newValue, prevValue) => {
        if (!prevValue && newValue) {
            await useWatchlistStore().init();
            await useTransactionsStore().init();
        }
    }
);

onMounted(async () => {
    if (!authStore.isLogged) return;
    await useWatchlistStore().init();
    await useTransactionsStore().init();
});
</script>
