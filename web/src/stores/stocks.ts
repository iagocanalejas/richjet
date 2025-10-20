import { defineStore } from 'pinia';
import { type StockQuote, type StockSymbol } from '@/types/stock';
import StocksService from './api/stocks';

export const useStocksStore = defineStore('stocks', () => {
    const _quoteCache = new Map<string, StockQuote>();

    function symbolSearch(query: string, is_load_more: boolean) {
        return StocksService.symbolSearch(query, is_load_more);
    }

    async function getStockQuotes(symbols: StockSymbol[]) {
        const eligible = symbols.filter((s) => s.source && !s.is_user_created && !s.is_manual_price);
        const cached = eligible.filter((s) => _quoteCache.has(s.ticker));
        const uncachedTickers = eligible.filter((s) => !_quoteCache.has(s.ticker)).map((s) => s.ticker);

        const results = cached.map((s) => _quoteCache.get(s.ticker)!);
        if (uncachedTickers.length > 0) {
            const fetched = await StocksService.getStockQuote(uncachedTickers);
            if (fetched?.length) {
                fetched.forEach((q) => _quoteCache.set(q.ticker, q));
                results.push(...fetched);
            }
        }

        return results;
    }

    function getStockQuoteSync(symbol: StockSymbol) {
        if (!symbol || !symbol.source || symbol.is_user_created || symbol.is_manual_price) return;
        return _quoteCache.get(symbol.ticker);
    }

    return { symbolSearch, getStockQuotes, getStockQuoteSync };
});
