<template>
    <main class="justify-center min-h-[calc(100vh-72px)] bg-gray-900 text-white p-6">
        <div class="flex flex-col justify-center items-center w-full max-w-2xl mx-auto">
            <SearchComponent @on-search="debouncedFilterResults" />
        </div>
        <div class="flex flex-col justify-center items-center w-full max-w-2xl mx-auto">
            <div v-if="watchlist.length" class="w-full mt-4">
                <button
                    class="flex items-center justify-between w-full text-left text-xl font-semibold mb-2 focus:outline-none"
                    @click="showFavorites = !showFavorites"
                >
                    <span>Favorites</span>
                    <svg
                        :class="{ 'rotate-180': showFavorites }"
                        class="w-5 h-5 transition-transform me-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                    </svg>
                </button>
                <div v-show="showFavorites">
                    <SharesListComponent :values="watchlist" @favorite="toggleFavorite" @transact="addTransaction" />
                </div>
            </div>

            <div class="w-full mt-4">
                <h2 class="text-xl font-semibold mb-2">Shares</h2>
                <SharesListComponent :values="filteredResults" @favorite="toggleFavorite" @transact="addTransaction" />
            </div>
        </div>
    </main>
</template>

<script setup lang="ts">
import SearchComponent from '@/components/SearchComponent.vue';
import SharesListComponent from '@/components/shares/SharesListComponent.vue';
import { ref, type Ref } from 'vue';
import { useStocksStore } from '@/stores/stocks';
import type { StockSymbolForDisplay, StockSymbol } from '@/types/stock';
import { debounce } from '@/utils/utils';
import { useWatchlistStore } from '@/stores/watchlist';
import { usePortfolioStore } from '@/stores/portfolio';
import { storeToRefs } from 'pinia';

const stockStore = useStocksStore();
const { addTransaction } = usePortfolioStore();
const watchlistStore = useWatchlistStore();
const { watchlist } = storeToRefs(watchlistStore);
const { isInWatchlist, addToWatchlist, removeFromWatchlist } = watchlistStore;

const showFavorites = ref(true);
const filteredResults: Ref<StockSymbolForDisplay[]> = ref([]);

const debouncedFilterResults = debounce(_filterResults);
async function _filterResults(query: string) {
    if (!query) {
        filteredResults.value = [];
        return;
    }

    const extraProperties: Omit<StockSymbolForDisplay, keyof StockSymbol> = {
        hideImage: false,
        isFavorite: true,
        price: undefined,
        openPrice: undefined,
        noPrice: false,
    };
    const results = (await stockStore.symbolSearch(query.toUpperCase())) as StockSymbolForDisplay[];
    filteredResults.value = results.map((s) => ({
        ...s,
        ...extraProperties,
        isFavorite: isInWatchlist(s),
    }));
}

function toggleFavorite(result: StockSymbolForDisplay) {
    result.isFavorite = !result.isFavorite;
    if (result.isFavorite) {
        addToWatchlist(result);
    } else {
        removeFromWatchlist(result);
    }
}
</script>
