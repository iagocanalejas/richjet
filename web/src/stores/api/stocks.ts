import type { StockQuote, StockSymbol } from '@/types/stock';
import { useErrorsStore, type CustomError } from '../errors';
import { safeFetch } from './_utils';

const BASE_URL = import.meta.env.VITE_BACKEND_BASE_URL || '/api';

const addError = (e: CustomError) => useErrorsStore().addError(e);

// NOTE: Don't use safeFetch in this module.

async function symbolSearch(query: string, is_load_more: boolean) {
    const url = `${BASE_URL}/search?q=${query}&load_more=${is_load_more}`;
    try {
        const opts = { method: 'GET', timeout: 15000 };
        const res = await fetch(url, opts);
        if (!res.ok) {
            const err = await res.json();
            addError({
                readable_message: err.detail ?? `Error searching for stock symbols: ${query}`,
                trace: { status: res.status, statusText: res.statusText, url: res.url },
            });
            return [];
        }

        const data = await res.json();
        if (data.errors?.length) {
            addError({
                readable_message: `Error searching for stock symbols: ${query}`,
                trace: { statusText: data.errors.join(', '), url: url },
            });
            return [];
        }
        return data.results as StockSymbol[];
    } catch (err) {
        addError({
            readable_message: `Error searching for stock symbols: ${query}`,
            trace: { status: err instanceof Error ? err.message : String(err), url: url },
        });
    }
    return [];
}

async function getStockQuote(symbol: StockSymbol) {
    const f = fetch(`${BASE_URL}/quotes/${symbol.ticker}`, { method: 'GET', credentials: 'include' });
    return safeFetch<StockQuote>(f, 'Failed to fetch stock quote for ' + symbol.ticker);
}

const StocksService = { symbolSearch, getStockQuote };
export default StocksService;
