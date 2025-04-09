<template>
	<header class="flex items-center justify-between p-4 bg-gray-800 text-white shadow-md">
		<div class="flex items-center space-x-4">
			<img src="@/assets/logo.svg" alt="Logo" class="h-10 w-10" />
		</div>
		<nav class="flex space-x-4 ml-auto">
			<RouterLink to="/"
				class="px-3 py-2 rounded-lg transition duration-200 hover:bg-gray-700 hover:text-gray-300">
				Portfolio
			</RouterLink>
			<RouterLink to="/shares"
				class="px-3 py-2 rounded-lg transition duration-200 hover:bg-gray-700 hover:text-gray-300">
				Shares
			</RouterLink>
			<RouterLink to="/transactions"
				class="px-3 py-2 rounded-lg transition duration-200 hover:bg-gray-700 hover:text-gray-300">
				Transactions
			</RouterLink>
			<div class="relative">
				<select v-model="currency"
					class="appearance-none bg-gray-700 text-white pl-8 py-2 rounded-lg pr-8 focus:outline-none focus:ring-2 focus:ring-gray-500 cursor-pointer">
					<option value="USD">USD</option>
					<option value="EUR">EUR</option>
				</select>
			</div>
		</nav>
	</header>
	<RouterView />
</template>

<script setup lang="ts">
import { RouterLink, RouterView } from "vue-router";
import { useFinnhubStore } from "./stores/finnhub";
import { onMounted } from "vue";
import { useSettingsStore } from "./stores/settings";
import { storeToRefs } from "pinia";

const finnhubStore = useFinnhubStore();
const { currency } = storeToRefs(useSettingsStore());

onMounted(() => {
	finnhubStore.symbolSearch("AM");
});
</script>
