<template>
	<header class="flex items-center justify-between p-4 bg-gray-800 text-white shadow-md">
		<RouterLink to="/" class="flex items-center space-x-2 hover:opacity-80 transition">
			<img src="@/assets/logo.png" alt="Logo" class="h-10 w-10" />
			<span class="text-xl font-semibold text-white">RichJet</span>
		</RouterLink>
		<nav class="flex space-x-4 ml-auto">
			<RouterLink v-if="isLogged" to="/"
				class="px-3 py-2 rounded-lg transition duration-200 hover:bg-gray-700 hover:text-gray-300"
				active-class="bg-gray-700 text-gray-300" exact>
				Portfolio
			</RouterLink>
			<RouterLink v-if="isLogged" to="/shares"
				class="px-3 py-2 rounded-lg transition duration-200 hover:bg-gray-700 hover:text-gray-300"
				active-class="bg-gray-700 text-gray-300">
				Shares
			</RouterLink>
			<RouterLink v-if="isLogged" to="/transactions"
				class="px-3 py-2 rounded-lg transition duration-200 hover:bg-gray-700 hover:text-gray-300"
				active-class="bg-gray-700 text-gray-300">
				Transactions
			</RouterLink>

			<AccountSelector :is-logged="isLogged" :accounts="accounts" :selected="selectedAccount" @add="addAccount"
				@select="selectedAccount = $event" />

			<div v-if="isLogged" class="relative">
				<select v-model="currency"
					class="appearance-none bg-gray-700 text-white pl-8 py-2 rounded-lg pr-8 focus:outline-none focus:ring-2 focus:ring-gray-500 cursor-pointer">
					<option value="USD">USD</option>
					<option value="EUR">EUR</option>
				</select>
			</div>

			<div class="relative" v-if="googleUser?.picture">
				<img :src="googleUser.picture" alt="User"
					class="w-10 h-10 rounded-full object-cover border-2 border-blue-400 cursor-pointer"
					@click="showMenu = !showMenu" />
				<div v-if="showMenu"
					class="absolute right-0 mt-2 w-48 bg-gray-800 text-white rounded-lg shadow-lg z-50 border border-gray-700">
					<button @click="signOut"
						class="block w-full text-left px-4 py-2 hover:bg-gray-700 rounded-b-lg transition">
						Sign out
					</button>
				</div>
			</div>

			<div v-else>
				<button @click="signIn"
					class="flex items-center gap-2 bg-white text-gray-700 px-3 py-3 rounded-full shadow hover:shadow-md transition hover:bg-gray-100 cursor-pointer">
					<img src="https://developers.google.com/identity/images/g-logo.png" alt="Google logo"
						class="w-5 h-5" />
				</button>
			</div>
		</nav>
	</header>

	<LoadingBar />
	<LandingView v-if="!isLogged" @sign-in="signIn" />
	<RouterView v-else />

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
import { RouterLink, RouterView } from "vue-router";
import { useSettingsStore } from "./stores/settings";
import { storeToRefs } from "pinia";
import { onMounted, ref } from "vue";
import { useGoogleStore } from "./stores/google";
import { useWatchlistStore } from "./stores/watchlist";
import { usePortfolioStore } from "./stores/portfolio";
import LoadingBar from "./components/LoadingBar.vue";
import LandingView from "./views/LandingView.vue";
import AccountSelector from "./components/utils/AccountSelector.vue";
import type { Account } from "./types/google";

const googleStore = useGoogleStore();
const settingsStore = useSettingsStore();
const { client: googleClient, user: googleUser, isLogged } = storeToRefs(googleStore);
const { currency, accounts, account: selectedAccount } = storeToRefs(settingsStore);
const currentYear = new Date().getFullYear()

const showMenu = ref(false);

function signIn() {
	googleClient.value!.requestAccessToken();
}

function signOut(): void {
	googleStore.revoke();
	showMenu.value = false;
}

function addAccount(account: Account) {
	if (accounts.value.some((a) => a.name === account.name)) {
		alert("Account already exists");
		return;
	}
	accounts.value = [...accounts.value, account];
	selectedAccount.value = account;
}

onMounted(async () => {
	const config = await googleStore.init();
	console.log("google client initialized", config);

	await settingsStore.init(config?.settings);
	await usePortfolioStore().init(config?.transactions, config?.manualPrices);
	await useWatchlistStore().init(config?.watchlist);
});
</script>
