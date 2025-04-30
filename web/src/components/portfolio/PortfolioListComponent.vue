<template>
	<div v-if="portfolio.length" class="mt-6 w-full">
		<div class="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_0.2fr] gap-4 px-4 py-2 text-sm font-semibold text-white">
			<div>Asset</div>
			<div class="text-right">Avg Price</div>
			<div class="text-right">Quantity</div>
			<div class="text-right">Value</div>
			<div class="text-right">Rentability</div>
			<div class="text-right"></div>
		</div>
		<ul class="space-y-4">
			<li v-for="item in portfolio" :key="item.symbol" @click="showContextMenu($event, item)"
				class="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_0.2fr] gap-4 items-center bg-gray-800 p-4 rounded-lg cursor-pointer">
				<PortfolioItemComponent v-if="!isTradePortfolioItem(item)" :item="item" />
				<PortfolioTradeItemComponent v-else :item="item" />
			</li>
		</ul>
	</div>

	<div v-else-if="!isLoading" class="mt-6 w-full text-center text-gray-500">
		<p class="text-sm">No results found.</p>
	</div>

	<ContextMenu :visible="contextMenu.visible" :x="contextMenu.x" :y="contextMenu.y"
		@add-dividends="openDividendsModal(contextMenu.item!)" @set-price="openManualPriceModal(contextMenu.item!)"
		@close="contextMenu.visible = false" />

	<div v-if="isDividendModalOpen && transaction"
		class="fixed inset-0 bg-gray-800 bg-opacity-75 flex justify-center items-center z-50">
		<DividendModal :transaction="transaction" @add-dividend="addDividend" @close="isDividendModalOpen = false" />
	</div>
	<div v-if="isPriceModalOpen" class="fixed inset-0 bg-gray-800 bg-opacity-75 flex justify-center items-center z-50">
		<ManualPriceModal :item="selectedItem!" @set-price="setPrice" @close="isPriceModalOpen = false" />
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
import DividendModal from "../modals/DividendModal.vue";
import { useSettingsStore } from "@/stores/settings";
import { isPortfolioItemWithManualPrice, isTradePortfolioItem } from "@/types/rules";
import ContextMenu from "../utils/ContextMenu.vue";
import ManualPriceModal from "../modals/ManualPriceModal.vue";

const portfolioStore = usePortfolioStore();
const { portfolio } = storeToRefs(portfolioStore);
const { currency } = storeToRefs(useSettingsStore());
const { isLoading } = storeToRefs(useLoadingStore());

// modal
const isDividendModalOpen = ref(false);
const isPriceModalOpen = ref(false);
const transaction = ref<TransactionItem | null>(null);
const selectedItem = ref<PortfolioItem | null>(null);

// context menu
const contextMenu = ref<{ visible: boolean, x: number, y: number, item: PortfolioItem | null }>({
	visible: false,
	x: 0,
	y: 0,
	item: null,
});

function showContextMenu(event: MouseEvent, item: PortfolioItem) {
	event.preventDefault()
	event.stopPropagation()

	if (!isPortfolioItemWithManualPrice(item)) {
		openDividendsModal(item);
		return;
	}

	contextMenu.value = {
		visible: true,
		x: event.clientX,
		y: event.clientY,
		item
	}
}

function openDividendsModal(item: PortfolioItem) {
	transaction.value = {
		symbol: item.symbol,
		image: item.image,
		type: item.type,
		price: 0,
		quantity: 0,
		comission: 0,
		date: new Date().toISOString().split("T")[0],
		transactionType: "dividend-cash",
		currency: currency.value,
	};
	isDividendModalOpen.value = true;
}

function openManualPriceModal(item: PortfolioItem) {
	selectedItem.value = item;
	isPriceModalOpen.value = true;
}

function addDividend(t: TransactionItem) {
	portfolioStore.addTransaction(t);
	transaction.value = null;
	isDividendModalOpen.value = false;
}

function setPrice(item: { symbol: string, price: number }) {
	portfolioStore.updateManualPrice(item.symbol, item.price);
	isPriceModalOpen.value = false;
}
</script>
