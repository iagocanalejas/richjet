<template>
	<main class="justify-center min-h-[calc(100vh-72px)] bg-gray-900 text-white p-6">
		<div class="flex flex-col justify-center items-center w-full max-w-2xl mx-auto">
			<!-- TODO: totals -->
		</div>
		<div class="flex flex-col justify-center items-center w-full max-w-2xl mx-auto">
			<PortfolioListComponent :values="portfolio" />
		</div>
	</main>
</template>

<script setup lang="ts">
import PortfolioListComponent from "@/components/PortfolioListComponent.vue";
import { useFinnhubStore } from "@/stores/finnhub";
import { usePortfolioStore } from "@/stores/portfolio";
import { onBeforeMount } from "vue";

const { portfolio } = usePortfolioStore();
const finnhubStore = useFinnhubStore();

onBeforeMount(() => {
	portfolio.forEach(async (item) => {
		if (item.quantity > 0) {
			const quote = await finnhubStore.getStockQuote(item.symbol);
			if (!quote) {
				console.error(`Failed to fetch quote for ${item.symbol}`);
			}
			item.currentPrice = quote?.c || 0.0;
		}
	});
});
</script>
