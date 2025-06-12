import { defineStore } from 'pinia';
import { type StockSymbol, type StockSymbolForDisplay } from '@/types/stock';
import { ref } from 'vue';
import { useStocksStore } from './stocks';

export const useWatchlistStore = defineStore('watchlist', () => {
    const watchlist = ref<StockSymbolForDisplay[]>([]);
    const manualPrices = ref<{ [x: string]: number }>({});

    const stockStore = useStocksStore();

    async function init() {
        const res = await fetch('/api/watchlist', { method: 'GET', credentials: 'include' });
        if (!res.ok) throw new Error('Failed to fetch watchlist');
        const data = await res.json();

        const extraProperties: Omit<StockSymbolForDisplay, keyof StockSymbol> = {
            hideImage: false,
            isFavorite: true,
            price: undefined,
            openPrice: undefined,
            noPrice: false,
        };
        const tempWatchlist: StockSymbolForDisplay[] =
            data.map((w: StockSymbol) => ({ ...w, ...extraProperties })) || [];

        for (const item of tempWatchlist) {
            const quote = await stockStore.getStockQuote(item.source, item.ticker);
            if (!quote) {
                item.noPrice = true;
                continue;
            }
            item.price = quote?.current;
            item.openPrice = quote?.open;
        }

        watchlist.value = tempWatchlist;
        manualPrices.value = tempWatchlist
            .filter((w) => !!w.manual_price)
            .reduce(
                (acc, w) => {
                    acc[w.ticker] = w.manual_price!;
                    return acc;
                },
                {} as { [x: string]: number }
            );
    }

    function isInWatchlist(symbol: StockSymbolForDisplay) {
        return watchlist.value.some((s) => s.ticker === symbol.ticker);
    }

    async function addToWatchlist(item: StockSymbolForDisplay) {
        const quote = await stockStore.getStockQuote(item.source, item.ticker);
        if (!quote) console.error(`Failed to fetch quote for ${item.ticker}`);

        const res = await fetch('/api/watchlist', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item),
        });
        if (!res.ok) throw new Error('Failed to add to watchlist');
        watchlist.value.push({
            ...(await res.json()),
            price: quote?.current,
            openPrice: quote?.open,
            isFavorite: true,
            noPrice: false,
        });
        watchlist.value.sort((a, b) => a.ticker.localeCompare(b.ticker));
    }

    async function removeFromWatchlist(item: StockSymbolForDisplay) {
        const res = await fetch(`/api/watchlist/${item.id!}`, {
            method: 'DELETE',
            credentials: 'include',
        });
        if (!res.ok) throw new Error('Failed to remove from watchlist');
        watchlist.value = watchlist.value.filter((s) => s.ticker !== item.ticker);
    }

    async function updateSymbolManualPrice(symbol_id: string, price?: number) {
        if (price && price < 0) throw new Error('Price cannot be negative');
        if (price && isNaN(price)) throw new Error('Price must be a number');

        const res = await fetch(`/api/watchlist/${symbol_id}`, {
            method: 'PUT',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ price }),
        });
        if (!res.ok) throw new Error('Failed to update manual price');
        const updatedSymbol = (await res.json()) as StockSymbol;

        if (!updatedSymbol.manual_price) {
            delete manualPrices.value[updatedSymbol.ticker];
            return updatedSymbol;
        }
        manualPrices.value[updatedSymbol.ticker] = updatedSymbol.manual_price;
        return updatedSymbol;
    }

    return {
        init,
        watchlist,
        manualPrices,
        isInWatchlist,
        addToWatchlist,
        removeFromWatchlist,
        updateSymbolManualPrice,
    };
});
