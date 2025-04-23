<template>
	<div class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center px-4">
		<div class="w-full max-w-md bg-gray-900 text-white rounded-2xl shadow-2xl p-6 space-y-6 animate-fadeIn">
			<div class="text-center space-y-1">
				<h2 class="text-xl font-bold tracking-wide">Add Dividend for {{ selectedOption.symbol }}</h2>
			</div>

			<div class="flex justify-center space-x-4">
				<button class="px-4 py-2 rounded-md font-medium transition"
					:class="[dividendType === 'cash' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600']"
					@click="dividendType = 'cash'">
					Cash Dividend
				</button>
				<button class="px-4 py-2 rounded-md font-medium transition"
					:class="[dividendType === 'stock' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600']"
					@click="dividendType = 'stock'">
					Stock Dividend
				</button>
			</div>

			<div v-if="dividendType === 'cash'" class="space-y-4">
				<div>
					<label class="block text-sm font-medium text-gray-300 mb-1">Amount (Cash)</label>
					<input v-model.number="selectedOption.price" type="number" min="0" step="0.01"
						class="w-full bg-gray-800 text-white px-3 py-2 rounded-lg border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500" />
				</div>

				<div>
					<label class="block text-sm font-medium text-gray-300 mb-1">Date</label>
					<input v-model="selectedOption.date" type="date"
						class="w-full bg-gray-800 text-white px-3 py-2 rounded-lg border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500" />
				</div>
			</div>

			<div v-else class="space-y-4">
				<div>
					<label class="block text-sm font-medium text-gray-300 mb-1">Quantity (Shares)</label>
					<input v-model.number="selectedOption.quantity" type="number" min="0" step="0.01"
						class="w-full bg-gray-800 text-white px-3 py-2 rounded-lg border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500" />
				</div>

				<div>
					<label class="block text-sm font-medium text-gray-300 mb-1">Date</label>
					<input v-model="selectedOption.date" type="date"
						class="w-full bg-gray-800 text-white px-3 py-2 rounded-lg border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500" />
				</div>
			</div>

			<div class="flex flex-col gap-2 pt-2">
				<button @click="submit"
					class="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-md text-sm font-semibold transition cursor-pointer">
					Add {{ dividendType === 'cash' ? 'Cash' : 'Stock' }} Dividend
				</button>
				<button @click="$emit('close')"
					class="w-full bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-md text-sm font-medium transition cursor-pointer">
					Cancel
				</button>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import type { TransactionItem } from '@/types/stock';
import { ref } from 'vue';

const props = defineProps({
	selectedOption: {
		type: Object as () => TransactionItem,
		required: true
	}
});

const emit = defineEmits(["add-dividend", "close"]);

const dividendType = ref<"cash" | "stock">("cash");

function submit() {
	props.selectedOption.transactionType = dividendType.value === "cash" ? "dividend-cash" : "dividend";
	emit("add-dividend", props.selectedOption);
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
