<template>
	<main class="justify-center min-h-[calc(100vh-72px)] bg-gray-900 text-white p-6">
		<div class="flex flex-col justify-center items-center w-full max-w-2xl mx-auto">
			<SearchComponent @on-search="query = $event" />
		</div>
		<div class="flex flex-col justify-center items-center w-full max-w-2xl mx-auto">
			<TransactionsListComponent :values="filteredTransactions" @on-remove="removeTransaction" />
		</div>
	</main>
</template>

<script setup lang="ts">
import SearchComponent from "@/components/SearchComponent.vue";
import TransactionsListComponent from "@/components/TransactionsListComponent.vue";
import { usePortfolioStore } from "@/stores/portfolio";
import { storeToRefs } from "pinia";
import { computed, ref } from "vue";

const portfolioStore = usePortfolioStore();
const { removeTransaction } = portfolioStore;
const { transactions } = storeToRefs(portfolioStore);

const query = ref("");
const filteredTransactions = computed(() =>
	transactions.value.filter((tx) => tx.symbol.toLowerCase().includes(query.value.toLowerCase())),
);
</script>
