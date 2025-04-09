import { defineStore } from "pinia";
import { type FinnhubStockSymbolForDisplay } from "@/types/finnhub";
import { ref } from "vue";

export const useWatchlistStore = defineStore("watchlist", () => {
    const watchlist = ref<FinnhubStockSymbolForDisplay[]>([]);

    function init() {
        console.log("loading watchlist from localStorage");
        const storedWatchlist = localStorage.getItem("watchlist");
        watchlist.value = storedWatchlist ? JSON.parse(storedWatchlist) : [];
    }

    function isInWatchlist(symbol: FinnhubStockSymbolForDisplay) {
        return watchlist.value.some((s) => s.symbol === symbol.symbol);
    }

    function addToWatchlist(symbol: FinnhubStockSymbolForDisplay) {
        watchlist.value.push(symbol);
        localStorage.setItem("watchlist", JSON.stringify(watchlist.value));
    }

    function removeFromWatchlist(symbol: FinnhubStockSymbolForDisplay) {
        watchlist.value = watchlist.value.filter((s) => s.symbol !== symbol.symbol);
        localStorage.setItem("watchlist", JSON.stringify(watchlist.value));
    }

    return { init, isInWatchlist, addToWatchlist, removeFromWatchlist, watchlist };
});
