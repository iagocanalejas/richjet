<template>
    <main class="justify-center min-h-[calc(100vh-144px)] bg-gray-900 text-white p-6">
        <div class="flex flex-col justify-center items-center w-full max-w-2xl mx-auto">
            <div class="flex items-center justify-center w-full gap-4">
                <SearchComponent @on-search="debouncedFilterResults" />
                <button
                    @click="openShareModal()"
                    class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-semibold transition"
                >
                    Create
                </button>
            </div>
        </div>
        <div class="flex flex-col justify-center items-center w-full max-w-2xl mx-auto">
            <div v-if="watchlist.length" class="w-full mt-4">
                <button
                    class="flex items-center justify-between w-full text-left text-xl font-semibold mb-2 focus:outline-none"
                    @click="showFavorites = !showFavorites"
                >
                    <span>Favorites ({{ watchlist.length }} / {{ settings.limits.max_shares }})</span>
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
                <SharesListComponent
                    :values="filteredResults"
                    :show-load-more="showLoadMore"
                    @favorite="toggleFavorite"
                    @load-more="debouncedFilterResults('', true)"
                    @transact="addTransaction"
                />
            </div>
        </div>
    </main>

    <div
        v-if="isShareModalOpen && share"
        class="fixed inset-0 bg-gray-800 bg-opacity-75 flex justify-center items-center z-50"
    >
        <ShareModal v-if="isShareModalOpen && share" :share="share" @save="save" @close="closeModal" />
    </div>
</template>

<script setup lang="ts">
import SearchComponent from '@/components/SearchComponent.vue';
import SharesListComponent from '@/components/shares/SharesListComponent.vue';
import { ref, watch, type Ref } from 'vue';
import { useStocksStore } from '@/stores/stocks';
import { type StockSymbolForDisplay, type StockSymbol, stockSymbolForDisplayDefaults } from '@/types/stock';
import { debounce } from '@/utils/utils';
import { useWatchlistStore } from '@/stores/watchlist';
import { usePortfolioStore } from '@/stores/portfolio';
import { storeToRefs } from 'pinia';
import ShareModal from '@/components/modals/ShareModal.vue';
import { useSettingsStore } from '@/stores/settings';

const stockStore = useStocksStore();
const { addTransaction } = usePortfolioStore();
const watchlistStore = useWatchlistStore();
const { watchlist } = storeToRefs(watchlistStore);
const { isInWatchlist, addToWatchlist, removeFromWatchlist } = watchlistStore;
const { currency, settings } = storeToRefs(useSettingsStore());

const showFavorites = ref(true);
const showLoadMore = ref(false);
const filteredResults: Ref<StockSymbolForDisplay[]> = ref([]);

// modal
const isShareModalOpen = ref(false);
const share = ref<Omit<StockSymbol, 'id'> | undefined>();

let _query: string | undefined = undefined;
const debouncedFilterResults = debounce(_filterResults);
async function _filterResults(query: string, is_load_more: boolean = false) {
    showLoadMore.value = !is_load_more;
    if (is_load_more) {
        query = _query ?? '';
    }

    _query = query;
    if (!query) {
        filteredResults.value = [];
        return;
    }

    const results = (await stockStore.symbolSearch(query.toUpperCase(), is_load_more)) as StockSymbolForDisplay[];
    filteredResults.value = results.map((s) => ({
        ...s,
        ...stockSymbolForDisplayDefaults,
        isFavorite: isInWatchlist(s),
    }));
}

watch(
    () => watchlist.value,
    () => {
        filteredResults.value = filteredResults.value.map((s) => ({
            ...s,
            isFavorite: isInWatchlist(s),
        }));
    }
);

function toggleFavorite(result: StockSymbolForDisplay) {
    result.isFavorite = !result.isFavorite;
    if (result.isFavorite) {
        addToWatchlist(result);
    } else {
        removeFromWatchlist(result);
    }
}

function openShareModal() {
    isShareModalOpen.value = true;
    share.value = { source: 'created', currency: currency.value, manual_price: 0.0 } as Omit<StockSymbol, 'id'>;
}

function save(shareData: Omit<StockSymbol, 'id'>) {
    watchlistStore.addToWatchlistCreatingSymbol(shareData);
    isShareModalOpen.value = false;
    share.value = undefined;
}

function closeModal() {
    isShareModalOpen.value = false;
    share.value = undefined;
}
</script>
