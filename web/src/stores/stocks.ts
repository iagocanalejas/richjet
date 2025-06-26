import { defineStore } from 'pinia';
import { type StockQuote, type StockSymbol } from '@/types/stock';
import StocksService from './api/stocks';

export const useStocksStore = defineStore('stocks', () => {
    const _quoteCache = new Map<string, StockQuote>();

    function symbolSearch(query: string, is_load_more: boolean) {
        return StocksService.symbolSearch(query, is_load_more);
    }

    async function getStockQuote(symbol: StockSymbol) {
        if (!symbol.source || !symbol || symbol.is_user_created || symbol.manual_price) return;
        if (_quoteCache.has(symbol.ticker)) return _quoteCache.get(symbol.ticker)!;

        const data = await StocksService.getStockQuote(symbol);
        if (!data) return;
        _quoteCache.set(symbol.ticker, data);
        return data;
    }

    return { symbolSearch, getStockQuote };
});
