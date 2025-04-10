import { defineStore } from "pinia";
import { type FinnhubStockSymbolForDisplay } from "@/types/finnhub";
import { ref } from "vue";
import { useGoogleStore } from "./google";

export const useWatchlistStore = defineStore("watchlist", () => {
    const watchlist = ref<FinnhubStockSymbolForDisplay[]>([]);

    const googleStore = useGoogleStore();

    async function init(watchlistSymbols?: FinnhubStockSymbolForDisplay[]) {
        watchlist.value = watchlistSymbols || [];
    }

    function isInWatchlist(symbol: FinnhubStockSymbolForDisplay) {
        return watchlist.value.some((s) => s.symbol === symbol.symbol);
    }

    function addToWatchlist(symbol: FinnhubStockSymbolForDisplay) {
        watchlist.value.push(symbol);
        console.log("synced from addToWatchlist");
        googleStore.syncData();
    }

    function removeFromWatchlist(symbol: FinnhubStockSymbolForDisplay) {
        watchlist.value = watchlist.value.filter((s) => s.symbol !== symbol.symbol);
        console.log("synced from removeFromWatchlist");
        googleStore.syncData();
    }

    return { init, isInWatchlist, addToWatchlist, removeFromWatchlist, watchlist };
});
