import { useErrorsStore, type CustomError } from '../errors';
import type { StockSymbol, StockSymbolForDisplay } from '@/types/stock';

const BASE_URL = import.meta.env.VITE_BACKEND_BASE_URL || '/api';

const addError = (e: CustomError) => useErrorsStore().addError(e);

async function retrieveWatchlist() {
    const url = `${BASE_URL}/watchlist`;
    try {
        const res = await fetch(url, { method: 'GET', credentials: 'include' });
        if (!res.ok) {
            addError({
                readable_message: 'Failed to fetch watchlist',
                trace: { status: res.status, statusText: res.statusText, url: res.url },
            });
            return [];
        }
        const data = await res.json();

        const extraProperties: Omit<StockSymbolForDisplay, keyof StockSymbol> = {
            isFavorite: true,
            price: undefined,
            openPrice: undefined,
            noPrice: false,
        };
        const tempWatchlist: StockSymbolForDisplay[] =
            data.map((w: StockSymbol) => ({ ...w, ...extraProperties })) || [];
        return tempWatchlist;
    } catch (err) {
        addError({
            readable_message: 'Failed to fetch watchlist',
            trace: {
                status: err instanceof Error ? err.message : String(err),
                url: url,
            },
        });
    }
    return [];
}

async function addToWatchlist(symbol: StockSymbol) {
    const url = `${BASE_URL}/watchlist`;
    try {
        const res = await fetch(url, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(symbol),
        });
        if (!res.ok) {
            addError({
                readable_message: `Error adding ${symbol.ticker} to watchlist`,
                trace: { status: res.status, statusText: res.statusText, url: res.url },
            });
            return;
        }

        return (await res.json()) as StockSymbol;
    } catch (err) {
        addError({
            readable_message: `Error adding ${symbol.ticker} to watchlist`,
            trace: {
                status: err instanceof Error ? err.message : String(err),
                url: url,
            },
        });
    }
}

async function addToWatchlistCreatingSymbol(symbol: Omit<StockSymbol, 'id'>) {
    const url = `${BASE_URL}/symbols`;
    try {
        const res = await fetch(url, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(symbol),
        });
        if (!res.ok) {
            addError({
                readable_message: `Error creating symbol ${symbol.ticker}`,
                trace: { status: res.status, statusText: res.statusText, url: res.url },
            });
            return;
        }

        return (await res.json()) as StockSymbol;
    } catch (err) {
        addError({
            readable_message: `Error creating symbol ${symbol.ticker}`,
            trace: {
                status: err instanceof Error ? err.message : String(err),
                url: url,
            },
        });
    }
}

async function updateWatchlistSymbolPrice(symbol_id: string, price?: number) {
    const url = `${BASE_URL}/watchlist/${symbol_id}`;
    try {
        const res = await fetch(url, {
            method: 'PUT',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ price }),
        });
        if (!res.ok) {
            addError({
                readable_message: `Error updating manual price for symbol ${symbol_id}`,
                trace: { status: res.status, statusText: res.statusText, url: res.url },
            });
            return;
        }
        return (await res.json()) as StockSymbol;
    } catch (err) {
        addError({
            readable_message: `Error updating manual price for symbol ${symbol_id}`,
            trace: {
                status: err instanceof Error ? err.message : String(err),
                url: url,
            },
        });
    }
}

async function removeFromWatchlist(item: StockSymbol) {
    const url = `${BASE_URL}/watchlist/${item.id}`;
    try {
        const res = await fetch(url, { method: 'DELETE', credentials: 'include' });
        if (!res.ok) {
            addError({
                readable_message: `Error removing ${item.ticker} from watchlist`,
                trace: { status: res.status, statusText: res.statusText, url: res.url },
            });
            return false;
        }
        return true;
    } catch (err) {
        addError({
            readable_message: `Error removing ${item.ticker} from watchlist`,
            trace: {
                status: err instanceof Error ? err.message : String(err),
                url: url,
            },
        });
        return false;
    }
}

const WatchlistService = {
    retrieveWatchlist,
    addToWatchlist,
    addToWatchlistCreatingSymbol,
    updateWatchlistSymbolPrice,
    removeFromWatchlist,
};
export default WatchlistService;
