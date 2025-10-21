import { defineStore } from 'pinia';
import { type StockQuote, type StockSymbol } from '@/types/stock';
import StocksService from './api/stocks';
import type { TransactionItem } from '@/types/portfolio';

export const useStocksStore = defineStore('stocks', () => {
    const _quoteCache = new Map<string, StockQuote>();

    function symbolSearch(query: string, is_load_more: boolean) {
        return StocksService.symbolSearch(query, is_load_more);
    }

    async function _getStockQuotes(symbols: StockSymbol[]) {
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

    async function fillSymbolQuotes(symbols: StockSymbol[]) {
        const todo = [...new Set(symbols.filter((s) => !s.price))];
        const quotes: StockQuote[] = [];
        for (let i = 0; i < todo.length; i += 10) {
            const batch = todo.slice(i, i + 10);
            const batch_quotes = await _getStockQuotes(batch);
            quotes.push(...batch_quotes);
        }
        for (const symbol of symbols) {
            const quote = quotes.find((q) => q.ticker === symbol.ticker);
            if (!quote) continue;

            symbol.price = quote.current;
            symbol.open_price = quote.previous_close;
        }

        return symbols;
    }

    async function fillTransactionQuotes(transactions: TransactionItem[]) {
        const quotes = await fillSymbolQuotes(transactions.map((t) => t.symbol));
        for (const tr of transactions) {
            const quote = quotes.find((q) => q.ticker === tr.symbol.ticker);
            if (!quote) continue;
            tr.symbol.price = quote.price;
            tr.symbol.open_price = quote.open_price;
        }
        return transactions;
    }

    return { symbolSearch, fillSymbolQuotes, fillTransactionQuotes };
});
