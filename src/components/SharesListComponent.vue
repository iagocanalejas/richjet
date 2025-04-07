<template>
	<div v-if="values.length" class="mt-6 w-full">
		<ul class="space-y-4">
			<li v-for="(result, index) in visibleItems" :key="index" @click="openContextModal(result)"
				class="flex items-center justify-between bg-gray-800 p-4 rounded-lg space-x-4 cursor-pointer">
				<div class="flex items-center space-x-3">
					<img v-show="!result.hideImage" :src="imageURLfor(result)" alt="Icon"
						@error="result.hideImage = true" class="w-6 h-6 object-contain" />
					<span class="text-sm font-medium tracking-wide text-white">
						{{ result.symbol }}
					</span>
				</div>
				<button @click="emit('onFavorite', result)" class="text-gray-400 hover:text-red-500 transition-colors"
					:title="result.isFavorite ? 'Unfavorite' : 'Favorite'">
					<svg v-if="result.isFavorite" xmlns="http://www.w3.org/2000/svg" fill="currentColor"
						viewBox="0 0 24 24" class="w-5 h-5">
						<path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 
						5.42 4.42 3 7.5 3c1.74 0 3.41 0.81 4.5
						2.09C13.09 3.81 14.76 3 16.5 3 19.58 3
						22 5.42 22 8.5c0 3.78-3.4 6.86-8.55
						11.54L12 21.35z" />
					</svg>
					<svg v-else xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"
						class="w-5 h-5">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 
							5.42 4.42 3 7.5 3c1.74 0 3.41 0.81 4.5
							2.09C13.09 3.81 14.76 3 16.5 3 19.58 3
							22 5.42 22 8.5c0 3.78-3.4 6.86-8.55
							11.54L12 21.35z" />
					</svg>
				</button>
			</li>
		</ul>

		<Observer @intersect="currentPage++" />
	</div>

	<div v-else class="mt-6 w-full text-center text-gray-500">
		<p class="text-sm">No results found.</p>
	</div>

	<div v-if="isModalOpen && selectedOption"
		class="fixed inset-0 bg-gray-800 bg-opacity-75 flex justify-center items-center z-50">
		<div class="bg-gray-900 text-white p-6 rounded-lg shadow-xl space-y-4 w-80">
			<p class="text-lg font-semibold text-center">Choose an option for {{ selectedOption.symbol }}</p>
			<div class="space-y-2">
				<label for="quantity" class="text-sm">Quantity</label>
				<input id="quantity" v-model="selectedOption.quantity" type="number" min="1" step="1"
					class="w-full bg-gray-700 text-white p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
			</div>
			<div class="space-y-2">
				<label for="price" class="text-sm">Price</label>
				<input id="price" v-model="selectedOption.price" type="number" min="0" step="0.01"
					class="w-full bg-gray-700 text-white p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
			</div>
			<button @click="buy(selectedOption)"
				class="block w-full bg-green-600 hover:bg-blue-700 text-white py-2 rounded-md text-sm transition">
				Buy
			</button>
			<button @click="sell(selectedOption)"
				class="block w-full bg-blue-600 hover:bg-green-700 text-white py-2 rounded-md text-sm transition">
				Sell
			</button>
			<button @click="closeModal"
				class="block w-full bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-md text-sm transition">
				Cancel
			</button>
		</div>
	</div>
</template>

<script setup lang="ts">
import { symbolType2Image, type FinnhubStockSymbolForDisplay, type TransactionItem } from "@/types/finnhub";
import { computed, ref } from "vue";
import Observer from "./Observer.vue";

const ITEMS_PER_PATE = 20;

const props = defineProps({
	values: {
		type: Array as () => FinnhubStockSymbolForDisplay[],
		default: () => [],
	},
});
const emit = defineEmits(["onFavorite", "onTransaction"]);

const currentPage = ref(0);
const visibleItems = computed(() => {
	return props.values.slice(0, (currentPage.value + 1) * ITEMS_PER_PATE);
});

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
		date: new Date().toISOString(),
		transactionType: "buy",
	};
}

function buy(option: TransactionItem) {
	if (option.quantity <= 0 || option.price <= 0) {
		alert("Please enter a valid quantity and price.");
		return;
	}
	emit("onTransaction", option)
	closeModal();
}

function sell(option: TransactionItem) {
	if (option.quantity <= 0 || option.price <= 0) {
		alert("Please enter a valid quantity and price.");
		return;
	}
	option.transactionType = "sell";
	emit("onTransaction", option)
	closeModal();
}

function closeModal() {
	isModalOpen.value = false;
}

function imageURLfor(result: FinnhubStockSymbolForDisplay) {
	return `https://assets.parqet.com/logos/${symbolType2Image(result.type)}/${result.symbol}`;
}
</script>
