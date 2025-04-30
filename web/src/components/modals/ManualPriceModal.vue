<template>
	<div class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center px-4">
		<div class="w-full max-w-md bg-gray-900 text-white rounded-2xl shadow-2xl p-6 space-y-6 animate-fadeIn">
			<div class="text-center space-y-1">
				<h2 class="text-xl font-bold tracking-wide">New price for {{ item.symbol }}</h2>
				<p class="text-sm text-gray-400">{{ item.type }}</p>
			</div>

			<div class="space-y-4">
				<div>
					<label class="block text-sm font-medium text-gray-300 mb-1">Price</label>
					<input v-model="price" type="number" min="0" step="0.01"
						class="w-full bg-gray-800 text-white px-3 py-2 rounded-lg border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500" />
				</div>
			</div>

			<div class="flex flex-col gap-2 pt-2">
				<button @click="setPrice()"
					class="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-md text-sm font-semibold transition cursor-pointer">
					Set Price
				</button>
				<button @click="$emit('close')"
					class="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded-md text-sm font-semibold transition cursor-pointer">
					Cancel
				</button>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import type { PortfolioItem } from "@/types/stock";
import { ref } from "vue";

const props = defineProps({
	item: {
		type: Object as () => PortfolioItem,
		required: true
	}
});

const emit = defineEmits(["set-price", "close"]);

const price = ref(0);

function setPrice() {
	if (price.value <= 0) {
		alert("Please enter a valid price.");
		return;
	}
	emit('set-price', { symbol: props.item.symbol, price: price.value });
}
</script>

<style scoped>
@keyframes fadeIn {
	from {
		opacity: 0;
		transform: translateY(10px);
	}

	to {
		opacity: 1;
		transform: translateY(0);
	}
}

.animate-fadeIn {
	animation: fadeIn 0.3s ease-out;
}
</style>
