<template>
	<LoadingSpinner />
	<div v-if="values.length" class="mt-6 w-full">
		<ul class="space-y-4">
			<li v-for="(item, index) in visibleItems" :key="index" @click="openContextModal(item)"
				class="flex items-center justify-between bg-gray-800 p-4 rounded-lg space-x-4 cursor-pointer">
				<div class="flex items-center space-x-3">
					<img v-show="!item.hideImage" :src="imageURLfor(item)" alt="Icon" @error="item.hideImage = true"
						class="w-6 h-6 object-contain" />
					<span class="text-sm font-medium tracking-wide text-white">
						{{ item.symbol }}
					</span>
				</div>

				<div v-if="item.price" class="flex items-center space-x-4 text-sm">
					<div class="text-right" :class="magicClass(item.price - item.openPrice!)">
						<div class="font-semibold">{{ formatCurrency(item.price, currency) }}</div>
						<div class="text-xs">
							{{ item.price - item.openPrice! > 0 ? '+' : '' }}
							{{ ((item.price - item.openPrice!) / item.openPrice! * 100).toFixed(2) }}%
						</div>
					</div>
				</div>

				<div class="flex items-center space-x-2 relative">
					<button @click.stop="emit('onFavorite', item)"
						class="text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
						:title="item.isFavorite ? 'Unfavorite' : 'Favorite'">
						<svg v-if="item.isFavorite" xmlns="http://www.w3.org/2000/svg" fill="currentColor"
							viewBox="0 0 24 24" class="w-5 h-5">
							<path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2
						5.42 4.42 3 7.5 3c1.74 0 3.41 0.81 4.5
						2.09C13.09 3.81 14.76 3 16.5 3 19.58 3
						22 5.42 22 8.5c0 3.78-3.4 6.86-8.55
						11.54L12 21.35z" />
						</svg>
						<svg v-else xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
							stroke="currentColor" class="w-5 h-5">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2
							5.42 4.42 3 7.5 3c1.74 0 3.41 0.81 4.5
							2.09C13.09 3.81 14.76 3 16.5 3 19.58 3
							22 5.42 22 8.5c0 3.78-3.4 6.86-8.55
							11.54L12 21.35z" />
						</svg>
					</button>
					<button class="text-gray-400 hover:text-white cursor-pointer" title="Options"> ⋮ </button>
				</div>
			</li>
		</ul>

		<Observer @intersect="currentPage++" />
	</div>

	<div v-else-if="!isLoading" class="mt-6 w-full text-center text-gray-500">
		<p class="text-sm">No results found.</p>
	</div>

	<div v-if="isModalOpen && selectedOption"
		class="fixed inset-0 bg-gray-800 bg-opacity-75 flex justify-center items-center z-50">
		<TransactionModal v-if="isModalOpen && selectedOption" :selectedOption="selectedOption" @buy="buy" @sell="sell"
			@close="closeModal" />
	</div>
</template>

<script setup lang="ts">
import { symbolType2Image, type FinnhubStockSymbolForDisplay, type TransactionItem } from "@/types/finnhub";
import { computed, ref } from "vue";
import Observer from "./Observer.vue";
import { storeToRefs } from "pinia";
import { useSettingsStore } from "@/stores/settings";
import { formatCurrency, magicClass } from "@/types/utils";
import LoadingSpinner from "./LoadingSpinner.vue";
import TransactionModal from "./TransactionModal.vue";
import { useLoadingStore } from "@/stores/loading";

const ITEMS_PER_PATE = 20;

const props = defineProps({
	values: {
		type: Array as () => FinnhubStockSymbolForDisplay[],
		default: () => [],
	},
});
const emit = defineEmits(["onFavorite", "onTransaction"]);

const { currency } = storeToRefs(useSettingsStore());
const { isLoading } = storeToRefs(useLoadingStore());

// pagination
const currentPage = ref(0);
const visibleItems = computed(() => props.values.slice(0, (currentPage.value + 1) * ITEMS_PER_PATE));

// modal
const isModalOpen = ref(false);
const selectedOption = ref<TransactionItem | null>(null);

function openContextModal(option: FinnhubStockSymbolForDisplay) {
	isModalOpen.value = true;
	selectedOption.value = {
		symbol: option.symbol,
		image: imageURLfor(option),
		type: option.type,
		price: 0,
		quantity: 0,
		comission: 0,
		date: new Date().toISOString().split("T")[0],
		transactionType: "buy",
		currency: currency.value,
	};
}

function buy(option: TransactionItem) {
	if (option.quantity <= 0 || option.price <= 0) {
		alert("Please enter a valid quantity and price.");
		return;
	}
	emit("onTransaction", option);
	closeModal();
}

function sell(option: TransactionItem) {
	if (option.quantity <= 0 || option.price <= 0) {
		alert("Please enter a valid quantity and price.");
		return;
	}
	option.transactionType = "sell";
	emit("onTransaction", option);
	closeModal();
}

function closeModal() {
	isModalOpen.value = false;
}

function imageURLfor(result: FinnhubStockSymbolForDisplay) {
	return `https://assets.parqet.com/logos/${symbolType2Image(result.type)}/${result.symbol}`;
}
</script>
