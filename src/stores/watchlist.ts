import { defineStore } from "pinia";
import { type FinnhubStockSymbolForDisplay } from "@/types/finnhub";
import { ref } from "vue";
import { useGoogleStore } from "./google";
import { useFinnhubStore } from "./finnhub";

export const useWatchlistStore = defineStore("watchlist", () => {
	const watchlist = ref<FinnhubStockSymbolForDisplay[]>([]);

	const googleStore = useGoogleStore();
	const finnhubStore = useFinnhubStore();

	async function init(watchlistSymbols?: FinnhubStockSymbolForDisplay[]) {
		const tempWatchlist = watchlistSymbols || [];

		for (let item of tempWatchlist) {
			const quote = await finnhubStore.getStockQuote(item.symbol);
			if (!quote) console.error(`Failed to fetch quote for ${item.symbol}`);
			item.price = quote?.c;
			item.openPrice = quote?.o;
		}

		watchlist.value = tempWatchlist
	}

	function isInWatchlist(symbol: FinnhubStockSymbolForDisplay) {
		return watchlist.value.some((s) => s.symbol === symbol.symbol);
	}

	async function addToWatchlist(item: FinnhubStockSymbolForDisplay) {
		const quote = await finnhubStore.getStockQuote(item.symbol);
		if (!quote) console.error(`Failed to fetch quote for ${item.symbol}`);

		item.price = quote?.c;
		item.openPrice = quote?.o;

		watchlist.value.push(item);
		console.log("synced from addToWatchlist");
		googleStore.syncData();
	}

	function removeFromWatchlist(item: FinnhubStockSymbolForDisplay) {
		watchlist.value = watchlist.value.filter((s) => s.symbol !== item.symbol);
		console.log("synced from removeFromWatchlist");
		googleStore.syncData();
	}

	return { init, isInWatchlist, addToWatchlist, removeFromWatchlist, watchlist };
});
