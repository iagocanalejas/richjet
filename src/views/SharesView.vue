<template>
	<main class="justify-center min-h-[calc(100vh-72px)] bg-gray-900 text-white p-6">
		<div class="flex flex-col justify-center items-center w-full max-w-2xl mx-auto">
			<SearchComponent @on-search="debouncedFilterResults" />
		</div>
		<div class="flex flex-col justify-center items-center w-full max-w-2xl mx-auto">
			<SharesListComponent :values="filteredResults" @on-favorite="toggleFavorite"
				@on-transaction="addTransaction" />
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
import { useTransactionStore } from "@/stores/transactions";

const finnhubStore = useFinnhubStore();
const watchlistStore = useWatchlistStore();
const { addTransaction } = useTransactionStore();

const filteredResults: Ref<FinnhubStockSymbolForDisplay[]> = ref(watchlistStore.watchlist);

const debouncedFilterResults = debounce(_filterResults);
async function _filterResults(query: string) {
	if (!query) {
		filteredResults.value = watchlistStore.watchlist;
		return;
	}
	const results = (await finnhubStore.symbolSearch(query.toUpperCase())) as FinnhubStockSymbolForDisplay[];
	if (results) {
		const res = results.filter((s) => !s.symbol.includes("."));
		res.forEach((s) => {
			s.isFavorite = watchlistStore.isInWatchlist(s);
			s.hideImage = false;
		});
		filteredResults.value = res;
	}
}

function toggleFavorite(result: FinnhubStockSymbolForDisplay) {
	result.isFavorite = !result.isFavorite;
	if (result.isFavorite) {
		watchlistStore.addToWatchlist(result);
	} else {
		watchlistStore.removeFromWatchlist(result);
	}
}
</script>
