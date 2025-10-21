import { defineStore } from 'pinia';
import { type StockQuote, type StockSymbol } from '@/types/stock';
import { ref } from 'vue';
import { useStocksStore } from './stocks';
import WatchlistService from './api/watchlist';

export const useWatchlistStore = defineStore('watchlist', () => {
    const watchlist = ref<StockSymbol[]>([]);
    const { getStockQuotes } = useStocksStore();

    // TODO: is required to currently have this being called before the transactions init, it shouldn't be like that
    async function init() {
        const tempWatchlist = await WatchlistService.retrieveWatchlist();

        const symbols = [...new Set(tempWatchlist.filter((s) => !s.price))];
        const quotes: StockQuote[] = [];
        for (let i = 0; i < symbols.length; i += 10) {
            const batch = symbols.slice(i, i + 10);
            const batch_quotes = await getStockQuotes(batch);
            quotes.push(...batch_quotes);
        }
        for (const item of symbols) {
            const quote = quotes.find((q) => q.ticker === item.ticker);
            if (!quote) continue;

            item.price = quote.current;
            item.open_price = quote.previous_close;
        }

        watchlist.value = tempWatchlist;
    }

    function isInWatchlist(symbol: StockSymbol) {
        return watchlist.value.some((s) => s.ticker === symbol.ticker);
    }

    async function addToWatchlist(item: StockSymbol) {
        const newSymbol = await WatchlistService.addToWatchlist(item);
        if (!newSymbol) return;
        const quote = (await getStockQuotes([item]))[0];

        watchlist.value.push({ ...newSymbol, price: quote?.current, open_price: quote?.previous_close });
        watchlist.value.sort((a, b) => a.display_name.localeCompare(b.display_name));
    }

    async function addToWatchlistCreatingSymbol(symbol: Omit<StockSymbol, 'id'>) {
        const newSymbol = await WatchlistService.addToWatchlistCreatingSymbol(symbol);
        if (!newSymbol) return;
        watchlist.value.push({ ...newSymbol, price: undefined, open_price: undefined });
        watchlist.value.sort((a, b) => a.ticker.localeCompare(b.ticker));
    }

    async function removeFromWatchlist(item: StockSymbol) {
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
