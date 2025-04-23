<template>
	<section class="p-6 bg-gray-800 rounded-xl shadow-md grid grid-cols-3 md:grid-cols-5 gap-4 text-white">
		<div class="text-center">
			<h2 class="text-sm font-medium text-gray-400">Invested</h2>
			<p class="text-lg font-semibold text-white">
				{{ formatCurrency(totalInvested, currency) }}
			</p>
		</div>
		<div class="text-center">
			<h2 class="text-sm font-medium text-gray-400">Current</h2>
			<p class="text-lg font-semibold" :class="magicClass(portfolioCurrentValue - totalInvested)">
				{{ formatCurrency(portfolioCurrentValue, currency) }}
			</p>
		</div>
		<div class="text-center">
			<h2 class="text-sm font-medium text-gray-400">Closed</h2>
			<p class="text-lg font-semibold" :class="magicClass(closedPositions)">
				{{ formatCurrency(closedPositions, currency) }}
			</p>
		</div>
		<div class="text-center">
			<h2 class="text-sm font-medium text-gray-400">Dividends</h2>
			<p class="text-lg font-semibold text-green-400">
				{{ formatCurrency(cashDividends, currency) }}
			</p>
		</div>
		<div class="text-center">
			<h2 class="text-sm font-medium text-gray-400">Rentability</h2>
			<p class="text-lg font-semibold" :class="magicClass(rentability)">
				{{ rentability.toFixed(2) }}%
			</p>
		</div>
	</section>
</template>

<script lang="ts" setup>
import { usePortfolioStore } from "@/stores/portfolio";
import { useSettingsStore } from "@/stores/settings";
import { formatCurrency, magicClass } from "@/types/utils";
import { storeToRefs } from "pinia";
import { computed } from "vue";

const { currency } = storeToRefs(useSettingsStore());
const { portfolio, cashDividends } = storeToRefs(usePortfolioStore());

const totalInvested = computed(() => {
	return portfolio.value
		.filter((p) => p.quantity > 0)
		.reduce((acc, item) => acc + item.currentInvested + item.comission, 0);
});

const portfolioCurrentValue = computed(() => {
	return portfolio.value
		.filter((p) => p.quantity > 0)
		.reduce((acc, item) => acc + item.currentPrice * item.quantity, 0);
});

const rentability = computed(() => {
	return totalInvested.value
		? ((portfolioCurrentValue.value + closedPositions.value + cashDividends.value - totalInvested.value) / totalInvested.value) * 100
		: 0;
});

const closedPositions = computed(() => {
	return portfolio.value
		.filter((p) => p.quantity === 0)
		.reduce((acc, item) => acc + (item.totalRetrieved - (item.totalInverted + item.comission)), 0);
});
</script>
