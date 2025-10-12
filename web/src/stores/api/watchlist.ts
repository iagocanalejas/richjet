import { type StockSymbol } from '@/types/stock';
import { safeFetch } from './_utils';

const BASE_URL = import.meta.env.VITE_BACKEND_BASE_URL || '/api';

async function retrieveWatchlist(): Promise<StockSymbol[]> {
    const f = fetch(`${BASE_URL}/watchlist`, { method: 'GET', credentials: 'include' });
    const data = await safeFetch<StockSymbol[]>(f, 'Failed to fetch watchlist', []);
    return data.map((w: StockSymbol) => ({ ...w }));
}

function addToWatchlist(symbol: StockSymbol) {
    const f = fetch(`${BASE_URL}/watchlist`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(symbol),
    });
    return safeFetch<StockSymbol>(f, `Error adding ${symbol.ticker} to watchlist`);
}

function addToWatchlistCreatingSymbol(symbol: Omit<StockSymbol, 'id'>) {
    const f = fetch(`${BASE_URL}/symbols`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(symbol),
    });
    return safeFetch<StockSymbol>(f, `Error creating symbol ${symbol.ticker}`);
}

async function updateWatchlistSymbolPrice(symbol_id: string, price?: number) {
    const f = fetch(`${BASE_URL}/watchlist/${symbol_id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ price }),
    });
    return safeFetch<StockSymbol>(f, `Error updating manual price for symbol ${symbol_id}`);
}

async function removeFromWatchlist(item: StockSymbol) {
    const f = fetch(`${BASE_URL}/watchlist/${item.id}`, { method: 'DELETE', credentials: 'include' });
    return safeFetch(f, `Error removing ${item.ticker} from watchlist`, false);
}

const WatchlistService = {
    retrieveWatchlist,
    addToWatchlist,
    addToWatchlistCreatingSymbol,
    updateWatchlistSymbolPrice,
    removeFromWatchlist,
};
export default WatchlistService;
