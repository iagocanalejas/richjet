import type { StockQuote, StockSymbol } from '@/types/stock';
import { useErrorsStore, type CustomError } from '../errors';

const BASE_URL = import.meta.env.VITE_BACKEND_BASE_URL || '/api';

const addError = (e: CustomError) => useErrorsStore().addError(e);

// NOTE: Don't use safeFetch in this module.

async function retrieveConversionRate(from_currency: string, to_currency: string) {
    const url = `${BASE_URL}/exchangerate/${from_currency}/${to_currency}`;
    try {
        const res = await fetch(url, { method: 'GET' });
        if (!res.ok) {
            const err = await res.json();
            addError({
                readable_message: err.detail ?? 'Failed to fetch conversion rate',
                trace: { status: res.status, statusText: res.statusText, url: res.url },
            });
            return;
        }

        return (await res.json()).conversion_rate as number;
    } catch (err) {
        addError({
            readable_message: 'Failed to fetch conversion rate',
            trace: { status: err instanceof Error ? err.message : String(err), url: url },
        });
    }
}

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
    const url = `${BASE_URL}/quote/${symbol.ticker}`;
    try {
        const opts = { method: 'GET', timeout: 15000 };
        const response = await fetch(url, opts);
        if (!response.ok) {
            if (response.status === 404) {
                addError({
                    readable_message: `Price not found for ${symbol.ticker}`,
                    trace: { status: response.status, statusText: response.statusText, url: response.url },
                });
            } else {
                addError({
                    readable_message: `Error fetching stock quote for ${symbol.ticker}`,
                    trace: { status: response.status, statusText: response.statusText, url: response.url },
                });
            }
            return;
        }

        let data = await response.json();
        if (data.errors?.length) {
            addError({
                readable_message: `Error fetching stock quote for ${symbol.ticker}`,
                trace: {
                    statusText: data.errors.join(', '),
                    url: `${BASE_URL}/quote/${symbol.source}/${symbol.ticker}`,
                },
            });
            return;
        }

        data = {
            current: data.current,
            high: data.high,
            low: data.low,
            open: data.open,
            previpus_close: data.previpus_close,
        };
        return data as StockQuote;
    } catch (err) {
        addError({
            readable_message: `Error fetching stock quote for ${symbol.ticker}`,
            trace: { status: err instanceof Error ? err.message : String(err), url: url },
        });
    }
}

const StocksService = { retrieveConversionRate, symbolSearch, getStockQuote };
export default StocksService;
