<template>
	<main class="justify-center min-h-[calc(100vh-72px)] bg-gray-900 text-white p-6">
		<div class="flex flex-col justify-center items-center w-full max-w-2xl mx-auto">
			<!-- TODO: search in transactions -->
		</div>
		<div class="flex flex-col justify-center items-center w-full max-w-2xl mx-auto">
			<TransactionsListComponent :values="transactions" @on-remove="removeTransaction" />
		</div>
	</main>
</template>

<script setup lang="ts">
import TransactionsListComponent from "@/components/TransactionsListComponent.vue";
import { usePortfolioStore } from "@/stores/portfolio";
import { storeToRefs } from "pinia";

const portfolioStore = usePortfolioStore();
const { removeTransaction } = portfolioStore;
const { transactions } = storeToRefs(portfolioStore);
</script>
