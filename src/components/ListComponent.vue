<template>
	<div v-if="values.length" class="mt-6 w-full">
		<ul class="space-y-4">
			<li v-for="(result, index) in visibleItems" :key="index"
				class="flex items-center justify-between bg-gray-800 p-4 rounded-lg space-x-4">
				<div class="flex items-center space-x-3">
					<img v-show="!result.hideImage" :src="imageURLfor(result)" alt="Icon"
						@error="result.hideImage = true" class="w-6 h-6 object-contain" />
					<span class="text-sm font-medium tracking-wide text-white">
						{{ result.symbol }}
					</span>
				</div>
				<button @click="toggleFavorite(result)" class="text-gray-400 hover:text-red-500 transition-colors"
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
</template>

<script setup lang="ts">
import { symbolType2Image, type FinnhubStockSymbolForDisplay } from "@/types/finnhub";
import { computed, ref } from "vue";
import Observer from "./Observer.vue";

const props = defineProps({
	values: {
		type: Array as () => FinnhubStockSymbolForDisplay[],
		default: () => [],
	},
});

let currentPage = ref(0);
const itemsPerPage = 20;

const visibleItems = computed(() => {
	return props.values.slice(0, (currentPage.value + 1) * itemsPerPage);
});

function toggleFavorite(result: FinnhubStockSymbolForDisplay) {
	result.isFavorite = !result.isFavorite;
}

function imageURLfor(result: FinnhubStockSymbolForDisplay) {
	return `https://assets.parqet.com/logos/${symbolType2Image(result.type)}/${result.symbol}`;
}
</script>
