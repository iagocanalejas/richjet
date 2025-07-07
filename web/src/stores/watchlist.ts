import { defineStore } from 'pinia';
import { type StockSymbol, type StockSymbolForDisplay } from '@/types/stock';
import { ref } from 'vue';
import { useStocksStore } from './stocks';
import WatchlistService from './api/watchlist';

export const useWatchlistStore = defineStore('watchlist', () => {
    const watchlist = ref<StockSymbolForDisplay[]>([]);
    const stockStore = useStocksStore();

    async function init() {
        const tempWatchlist = await WatchlistService.retrieveWatchlist();

        for (const item of tempWatchlist) {
            const quote = await stockStore.getStockQuote(item);
            if (!quote) {
                item.noPrice = true;
                continue;
            }
            item.price = quote?.current;
            item.openPrice = quote?.open;
        }

        watchlist.value = tempWatchlist;
    }

    function isInWatchlist(symbol: StockSymbolForDisplay) {
        return watchlist.value.some((s) => s.ticker === symbol.ticker);
    }

    async function addToWatchlist(item: StockSymbolForDisplay) {
        const newSymbol = await WatchlistService.addToWatchlist(item);
        if (!newSymbol) return;
        const quote = await stockStore.getStockQuote(item);
        if (!quote) return;

        watchlist.value.push({
            ...newSymbol,
            price: quote?.current,
            openPrice: quote?.open,
            isFavorite: true,
            noPrice: false,
        });
        watchlist.value.sort((a, b) => a.ticker.localeCompare(b.ticker));
    }

    async function addToWatchlistCreatingSymbol(symbol: Omit<StockSymbol, 'id'>) {
        const newSymbol = await WatchlistService.addToWatchlistCreatingSymbol(symbol);
        if (!newSymbol) return;
        watchlist.value.push({
            ...newSymbol,
            isFavorite: true,
            price: undefined,
            openPrice: undefined,
            noPrice: true,
        });
        watchlist.value.sort((a, b) => a.ticker.localeCompare(b.ticker));
    }

    async function removeFromWatchlist(item: StockSymbolForDisplay) {
        const isRemoved = await WatchlistService.removeFromWatchlist(item);
        if (!isRemoved) return;
        watchlist.value = watchlist.value.filter((s) => s.ticker !== item.ticker);
    }

    function updateSymbolManualPrice(symbol_id: string, price?: number) {
        if (price && price < 0) throw new Error('Price cannot be negative');
        if (price && isNaN(price)) throw new Error('Price must be a number');

        return WatchlistService.updateWatchlistSymbolPrice(symbol_id, price);
    }

    return {
        init,
        watchlist,
        isInWatchlist,
        addToWatchlist,
        addToWatchlistCreatingSymbol,
        removeFromWatchlist,
        updateSymbolManualPrice,
    };
});
