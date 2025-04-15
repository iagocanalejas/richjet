<template>
	<div v-if="portfolio.length" class="mt-6 w-full">
		<div class="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-4 px-4 py-2 text-sm font-semibold text-white">
			<div>Asset</div>
			<div class="text-right">Avg Price</div>
			<div class="text-right">Quantity</div>
			<div class="text-right">Value</div>
			<div class="text-right">Rentability</div>
		</div>
		<ul class="space-y-4">
			<li v-for="item in portfolio" :key="item.symbol"
				class="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-4 items-center bg-gray-800 p-4 rounded-lg cursor-pointer">
				<PortfolioItemComponent v-if="item.quantity" :item="item" />
				<PortfolioTradeItemComponent v-else :item="item" />
			</li>
		</ul>
	</div>

	<div v-else class="mt-6 w-full text-center text-gray-500">
		<p class="text-sm">No results found.</p>
	</div>
</template>

<script lang="ts" setup>
import PortfolioItemComponent from "./PortfolioItemComponent.vue";
import PortfolioTradeItemComponent from "./PortfolioTradeItemComponent.vue";
import { usePortfolioStore } from "@/stores/portfolio";
import { storeToRefs } from "pinia";

const { portfolio } = storeToRefs(usePortfolioStore());
</script>
