import { defineStore } from 'pinia';
import { type StockQuote, type StockSymbol } from '@/types/stock';

export const useStocksStore = defineStore('stocks', () => {
    const BASE_URL = import.meta.env.VITE_BACKEND_BASE_URL;

    const _quoteCache = new Map<string, StockQuote>();

    async function symbolSearch(query: string) {
        try {
            const opts = { method: 'GET', timeout: 15000 };
            const response = await fetch(`${BASE_URL}/search?q=${query}`, opts);
            if (!response.ok) throw new Error('Network response was not ok');

            const data = await response.json();
            if (data.errors?.length) throw new Error(data.errors.join(', '));

            const results = data.results as StockSymbol[];

            if (results.some((s) => !s.ticker.includes('.'))) {
                // filter out symbols with a dot
                return results.filter(
                    (s) =>
                        !s.ticker.includes('.') &&
                        !/^-?\d+X SHORT\b/.test(s.name) &&
                        !/^-?\d+X LONG\b/.test(s.name) &&
                        !/^LS \d+X\b/.test(s.name)
                );
            }
            return results;
        } catch (error) {
            console.error(error);
        }
    }

    async function getStockQuote(source: string, symbol: string) {
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
