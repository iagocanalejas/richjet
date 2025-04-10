<template>
	<main class="justify-center min-h-[calc(100vh-72px)] bg-gray-900 text-white p-6">
		<div class="flex flex-col justify-center items-center w-full max-w-2xl mx-auto">
			<SearchComponent @on-search="debouncedFilterResults" />
		</div>
		<div class="flex flex-col justify-center items-center w-full max-w-2xl mx-auto">
			<div v-if="watchlist.length" class="w-full mt-4">
				<h2 class="text-xl font-semibold mb-2">Favorites</h2>
				<SharesListComponent :values="watchlist" @on-favorite="toggleFavorite"
					@on-transaction="addTransaction" />
			</div>

			<div class="w-full mt-4">
				<h2 class="text-xl font-semibold mb-2">Shares</h2>
				<SharesListComponent :values="filteredResults" @on-favorite="toggleFavorite"
					@on-transaction="addTransaction" />
			</div>
		</div>
	</main>
</template>

<script setup lang="ts">
import SearchComponent from "@/components/SearchComponent.vue";
import SharesListComponent from "@/components/SharesListComponent.vue";
import { ref, type Ref } from "vue";
import { useFinnhubStore } from "@/stores/finnhub";
import type { FinnhubStockSymbolForDisplay } from "@/types/finnhub";
import { debounce } from "@/types/utils";
import { useWatchlistStore } from "@/stores/shares";
import { usePortfolioStore } from "@/stores/portfolio";
import { storeToRefs } from "pinia";

const finnhubStore = useFinnhubStore();
const { addTransaction } = usePortfolioStore();
const watchlistStore = useWatchlistStore();
const { watchlist } = storeToRefs(watchlistStore);
const { isInWatchlist, addToWatchlist, removeFromWatchlist } = watchlistStore;

const filteredResults: Ref<FinnhubStockSymbolForDisplay[]> = ref([]);

const debouncedFilterResults = debounce(_filterResults);
async function _filterResults(query: string) {
	if (!query) {
		filteredResults.value = [];
		return;
	}
	const results = (await finnhubStore.symbolSearch(query.toUpperCase())) as FinnhubStockSymbolForDisplay[];
	if (results) {
		const res = results.filter((s) => !s.symbol.includes("."));
		res.forEach((s) => {
			s.isFavorite = isInWatchlist(s);
			s.hideImage = false;
		});
		filteredResults.value = res;
	}
}

function toggleFavorite(result: FinnhubStockSymbolForDisplay) {
	result.isFavorite = !result.isFavorite;
	result.isFavorite ? addToWatchlist(result) : removeFromWatchlist(result);
}
</script>
