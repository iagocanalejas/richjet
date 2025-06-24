import { defineStore } from 'pinia';
import { type StockQuote, type StockSymbol } from '@/types/stock';

export const useStocksStore = defineStore('stocks', () => {
    const BASE_URL = import.meta.env.VITE_BACKEND_BASE_URL;

    const _quoteCache = new Map<string, StockQuote>();

    async function symbolSearch(query: string, is_load_more: boolean) {
        try {
            const opts = { method: 'GET', timeout: 15000 };
            const response = await fetch(`${BASE_URL}/search?q=${query}&load_more=${is_load_more}`, opts);
            if (!response.ok) throw new Error('Network response was not ok');

            const data = await response.json();
            if (data.errors?.length) throw new Error(data.errors.join(', '));
            return data.results as StockSymbol[];
        } catch (error) {
            console.error(error);
        }
    }

    async function getStockQuote(source: string, symbol: string) {
        // TODO: avoid to do requests for "user_created" symbols and symbols with manual price set
        if (!source || !symbol) return;
        if (_quoteCache.has(symbol)) return _quoteCache.get(symbol)!;

        try {
            const opts = { method: 'GET', timeout: 15000 };
            const response = await fetch(`${BASE_URL}/quote/${source}/${symbol}`, opts);
            if (!response.ok) {
                if (response.status === 404) return;
                throw new Error('Network response was not ok');
            }

            let data = await response.json();
            if (data.errors?.length) throw new Error(data.errors.join(', '));

            data = {
                current: data.current,
                high: data.high,
                low: data.low,
                open: data.open,
                previpus_close: data.previpus_close,
            };
            _quoteCache.set(symbol, data);
            return data as StockQuote;
        } catch (error) {
            console.error(error);
        }
    }

    return { symbolSearch, getStockQuote };
});
