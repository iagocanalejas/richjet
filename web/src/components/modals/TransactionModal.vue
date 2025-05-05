<template>
	<div class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center px-4">
		<div class="w-full max-w-md bg-gray-900 text-white rounded-2xl shadow-2xl p-6 space-y-6 animate-fadeIn">
			<div class="text-center space-y-1">
				<h2 class="text-xl font-bold tracking-wide">Transaction for {{ transactionCopy.symbol }}</h2>
				<p class="text-sm text-gray-400">{{ transactionCopy.type }}</p>
			</div>

			<div class="space-y-4">
				<div>
					<label class="block text-sm font-medium text-gray-300 mb-1">Quantity</label>
					<input v-model="transactionCopy.quantity" type="number" min="1" step="1"
						class="w-full bg-gray-800 text-white px-3 py-2 rounded-lg border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500" />
				</div>

				<div>
					<label class="block text-sm font-medium text-gray-300 mb-1">Price</label>
					<input v-model="priceInput" type="text" inputmode="decimal" pattern="[0-9]*[.,]?[0-9]*"
						class="w-full bg-gray-800 text-white px-3 py-2 rounded-lg border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
						@input="transactionCopy.price = normalizePriceInput(priceInput)" />
				</div>

				<div>
					<label class="block text-sm font-medium text-gray-300 mb-1">Commission</label>
					<input v-model="transactionCopy.comission" type="number" min="0" step="0.01"
						class="w-full bg-gray-800 text-white px-3 py-2 rounded-lg border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500" />
				</div>

				<div>
					<label class="block text-sm font-medium text-gray-300 mb-1">Date</label>
					<input v-model="transactionCopy.date" type="date"
						class="w-full bg-gray-800 text-white px-3 py-2 rounded-lg border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500" />
				</div>
			</div>

			<div class="flex flex-col gap-2 pt-2">
				<div class="flex gap-2">
					<button @click="sell"
						class="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded-md text-sm font-semibold transition cursor-pointer">
						Sell
					</button>
					<button @click="buy"
						class="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-md text-sm font-semibold transition cursor-pointer">
						Buy
					</button>
				</div>
				<button @click="$emit('close')"
					class="w-full bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-md text-sm font-medium transition cursor-pointer">
					Cancel
				</button>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import type { TransactionItem } from "@/types/portfolio";
import { normalizePriceInput } from "@/utils/utils";
import { reactive, ref, watch } from "vue";

const props = defineProps({
	transaction: {
		type: Object as () => TransactionItem,
		required: true
	}
});

const emit = defineEmits(["buy", "sell", "close"]);

const priceInput = ref('');
const transactionCopy = reactive({ ...props.transaction });
watch(() => props.transaction, (newVal) => Object.assign(transactionCopy, newVal));

function buy() {
	if (transactionCopy.quantity <= 0 || transactionCopy.price <= 0) {
		alert("Please enter a valid quantity and price.");
		return;
	}
	emit("buy", transactionCopy);
}

function sell() {
	if (transactionCopy.quantity <= 0 || transactionCopy.price <= 0) {
		alert("Please enter a valid quantity and price.");
		return;
	}
	const option = { ...transactionCopy, transactionType: "sell" };
	emit("sell", option);
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
