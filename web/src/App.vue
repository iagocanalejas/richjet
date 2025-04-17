<template>
	<header class="flex items-center justify-between p-4 bg-gray-800 text-white shadow-md">
		<RouterLink to="/" class="flex items-center space-x-2 hover:opacity-80 transition">
			<img src="@/assets/logo.png" alt="Logo" class="h-10 w-10" />
			<span class="text-xl font-semibold text-white">RichJet</span>
		</RouterLink>
		<nav class="flex space-x-4 ml-auto">
			<RouterLink to="/"
				class="px-3 py-2 rounded-lg transition duration-200 hover:bg-gray-700 hover:text-gray-300"
				active-class="bg-gray-700 text-gray-300" exact>
				Portfolio
			</RouterLink>
			<RouterLink to="/shares"
				class="px-3 py-2 rounded-lg transition duration-200 hover:bg-gray-700 hover:text-gray-300"
				active-class="bg-gray-700 text-gray-300">
				Shares
			</RouterLink>
			<RouterLink to="/transactions"
				class="px-3 py-2 rounded-lg transition duration-200 hover:bg-gray-700 hover:text-gray-300"
				active-class="bg-gray-700 text-gray-300">
				Transactions
			</RouterLink>

			<div class="relative">
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

	<RouterView />

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

const googleStore = useGoogleStore();
const { client: googleClient, user: googleUser } = storeToRefs(googleStore);
const { currency } = storeToRefs(useSettingsStore());
const currentYear = new Date().getFullYear()

const showMenu = ref(false);

// TODO: loading state

function signIn() {
	googleClient.value!.requestAccessToken();
}

function signOut(): void {
	googleStore.revoke();
	showMenu.value = false;
}

onMounted(async () => {
	const config = await googleStore.init();
	console.log("google client initialized", config);

	await useSettingsStore().init(config?.settings);
	await useWatchlistStore().init(config?.watchlist);
	await usePortfolioStore().init(config?.transactions);
});
</script>
