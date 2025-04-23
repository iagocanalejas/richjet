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
			<li v-for="item in portfolio" :key="item.symbol" @click="openContextModal(item)"
				class="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-4 items-center bg-gray-800 p-4 rounded-lg cursor-pointer">
				<PortfolioItemComponent v-if="item.quantity" :item="item" />
				<PortfolioTradeItemComponent v-else :item="item" />
			</li>
		</ul>
	</div>

	<div v-else-if="!isLoading" class="mt-6 w-full text-center text-gray-500">
		<p class="text-sm">No results found.</p>
	</div>

	<div v-if="isModalOpen && selectedOption"
		class="fixed inset-0 bg-gray-800 bg-opacity-75 flex justify-center items-center z-50">
		<DividendModal v-if="isModalOpen && selectedOption" :selectedOption="selectedOption" @add-dividend="addDividend"
			@close="closeModal" />
	</div>
</template>

<script lang="ts" setup>
import { useLoadingStore } from "@/stores/loading";
import PortfolioItemComponent from "./PortfolioItemComponent.vue";
import PortfolioTradeItemComponent from "./PortfolioTradeItemComponent.vue";
import { usePortfolioStore } from "@/stores/portfolio";
import { storeToRefs } from "pinia";
import { ref } from "vue";
import type { PortfolioItem, TransactionItem } from "@/types/stock";
import DividendModal from "../DividendModal.vue";
import { useSettingsStore } from "@/stores/settings";

const portfolioStore = usePortfolioStore();
const { portfolio } = storeToRefs(portfolioStore);
const { currency } = storeToRefs(useSettingsStore());
const { isLoading } = storeToRefs(useLoadingStore());

// modal
const isModalOpen = ref(false);
const selectedOption = ref<TransactionItem | null>(null);

function openContextModal(option: PortfolioItem) {
	isModalOpen.value = true;
	selectedOption.value = {
		symbol: option.symbol,
		image: option.image,
		type: option.type,
		price: 0,
		quantity: 0,
		comission: 0,
		date: new Date().toISOString().split("T")[0],
		transactionType: "dividend-cash",
		currency: currency.value,
	};
}

function addDividend(transaction: TransactionItem) {
	if (transaction.transactionType === 'dividend-cash' && transaction.price <= 0) {
		alert("Please enter a valid price.");
		return;
	}
	if (transaction.transactionType === 'dividend' && transaction.quantity <= 0) {
		alert("Please enter a valid quantity.");
		return;
	}
	portfolioStore.addTransaction(transaction);
	closeModal();
}

function closeModal() {
	isModalOpen.value = false;
}
</script>
