<template>
	<div v-if="values.length" class="mt-6 w-full">
		<div class="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-4 px-4 py-2 text-sm font-semibold text-white">
			<div>Asset</div>
			<div class="text-right">Date</div>
			<div class="text-right">Avg Price</div>
			<div class="text-right">Quantity</div>
			<div class="text-right">Total</div>
			<div class="text-right"></div>
		</div>
		<ul class="space-y-4">
			<li v-for="(item, index) in visibleItems" :key="index"
				class="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-4 items-center p-4 rounded-lg cursor-pointer transition-colors border-l-4"
				:class="[item.transactionType === 'buy' ? 'border-green-600 bg-gray-800' : 'border-red-600 bg-gray-800']">
				<div class="flex items-center space-x-3">
					<img :src="item.image" alt="Icon" class="w-6 h-6 object-contain" />
					<span class="text-sm font-medium tracking-wide text-white">
						{{ item.symbol }}
					</span>
				</div>
				<div class="text-sm text-right">{{ new Date(item.date).toLocaleDateString() }}</div>
				<div class="text-sm text-right">{{ formatCurrency(item.price, currency) }}</div>
				<div class="text-sm text-right">{{ item.quantity }}</div>
				<div class="text-sm text-right">{{ formatCurrency(item.quantity * item.price, currency) }}</div>
				<div class="text-gray-400 text-right">
					<button @click="emit('onRemove', item)" class="hover:text-red-500 transition-colors" title="Remove">
						<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"
							class="w-5 h-5">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
								d="M10 12h4M4 6h16M9 6h6a2 2 0 012 2v12a2 2 0 01-2 2H7a2 2 0 01-2-2V8a2 2 0 012-2z" />
						</svg>
					</button>
				</div>
			</li>
		</ul>

		<Observer @intersect="currentPage++" />
	</div>

	<div v-else class="mt-6 w-full text-center text-gray-500">
		<p class="text-sm">No results found.</p>
	</div>
</template>

<script setup lang="ts">
import { type TransactionItem } from "@/types/finnhub";
import { computed, ref } from "vue";
import Observer from "./Observer.vue";
import { formatCurrency } from "@/types/utils";
import { storeToRefs } from "pinia";
import { useSettingsStore } from "@/stores/settings";

const emit = defineEmits(["onRemove"]);
const { currency } = storeToRefs(useSettingsStore());

const ITEMS_PER_PATE = 20;

const props = defineProps({
	values: {
		type: Array as () => TransactionItem[],
		default: () => [],
	},
});

const currentPage = ref(0);
const visibleItems = computed(() => {
	return props.values.slice(0, (currentPage.value + 1) * ITEMS_PER_PATE);
});
</script>
