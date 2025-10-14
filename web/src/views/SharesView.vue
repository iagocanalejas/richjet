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
                    <span>Favorites ({{ watchlist.length }} / {{ normalizeLimit(settings.limits.max_shares) }})</span>
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
                    <SharesListComponent
                        :values="filteredWatchlist"
                        @favorite="toggleFavorite"
                        @transact="addTransaction"
                    />
                </div>
            </div>

            <div class="w-full mt-4">
                <h2 class="text-xl font-semibold mb-2">Shares</h2>
                <SharesListComponent
                    :values="filteredResults"
                    :show-load-more="showLoadMore"
                    @favorite="toggleFavorite"
                    @load-more="debouncedFilterResults('', true)"
                    @load-price="loadItemPrice"
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
import { onMounted, ref, watch, type Ref } from 'vue';
import { useStocksStore } from '@/stores/stocks';
import { type StockSymbol } from '@/types/stock';
import { debounce, normalizeLimit } from '@/utils/utils';
import { useWatchlistStore } from '@/stores/watchlist';
import { storeToRefs } from 'pinia';
import ShareModal from '@/components/modals/ShareModal.vue';
import { useSettingsStore } from '@/stores/settings';
import { useTransactionsStore } from '@/stores/transactions';

const stockStore = useStocksStore();
const { addTransaction } = useTransactionsStore();
const watchlistStore = useWatchlistStore();
const { watchlist } = storeToRefs(watchlistStore);
const { isInWatchlist, addToWatchlist, removeFromWatchlist } = watchlistStore;
const settingsStore = useSettingsStore();
const { currency, settings } = storeToRefs(settingsStore);
const { toCurrency } = settingsStore;

const showFavorites = ref(true);
const showLoadMore = ref(false);
const filteredResults: Ref<StockSymbol[]> = ref([]);
const filteredWatchlist: Ref<StockSymbol[]> = ref([]);

// modal
const isShareModalOpen = ref(false);
const share = ref<Omit<StockSymbol, 'id'> | undefined>();

let _query: string | undefined = undefined;
let _isWatchlistFiltered = false;
const debouncedFilterResults = debounce(_filterResults);
async function _filterResults(query: string, is_load_more: boolean = false) {
    /*
     * 1. If the query is empty, reset the search and show the full watchlist.
     * 2. Filter the watchlist.
     * 3. First load_more click will send a normal request to the API.
     * 4. Second load_more click will send a load_more request to the API and hide the load_more button.
     */
    const q = (is_load_more ? (_query ?? '') : query).trim().toLowerCase();
    _query = q;

    if (!q) {
        resetSearch();
        return;
    }

    if (!is_load_more) {
        const results = watchlist.value.filter(
            (s) => s.ticker.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)
        );
        _isWatchlistFiltered = true;
        if (results.length > 0) {
            showLoadMore.value = true;
            filteredWatchlist.value = results;
            return;
        }
    }

    if (_isWatchlistFiltered) {
        is_load_more = false;
        _isWatchlistFiltered = false;
    }

    showFavorites.value = false;
    showLoadMore.value = !is_load_more;
    const results = await stockStore.symbolSearch(q.toUpperCase(), is_load_more);
    filteredResults.value = results.map((s) => ({ ...s, is_favorite: isInWatchlist(s) }));
}

onMounted(() => (filteredWatchlist.value = [...watchlist.value]));
watch(
    () => watchlist.value.length,
    () => resetSearch()
);

function resetSearch() {
    _query = undefined;
    _isWatchlistFiltered = false;
    showLoadMore.value = false;
    showFavorites.value = true;
    filteredResults.value = [];
    filteredWatchlist.value = [...watchlist.value];
}

function toggleFavorite(item: StockSymbol) {
    item.is_favorite = !item.is_favorite;
    if (item.is_favorite) {
        addToWatchlist(item);
    } else {
        removeFromWatchlist(item);
    }
}

async function loadItemPrice(item: StockSymbol) {
    console.log('Loading price for', item.ticker);
    const quote = await stockStore.getStockQuote(item);
    item.price = quote ? toCurrency(quote.current, quote.currency) : undefined;
    item.open_price =
        quote && quote.previous_close_currency
            ? toCurrency(quote.previous_close, quote.previous_close_currency)
            : undefined;
}

function openShareModal() {
    isShareModalOpen.value = true;
    share.value = { source: 'created', currency: currency.value, price: 0.0 } as Omit<StockSymbol, 'id'>;
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
