import { defineStore } from "pinia";
import { type StockSymbolForDisplay } from "@/types/stock";
import { ref } from "vue";
import { useGoogleStore } from "./google";
import { useStocksStore } from "./stocks";

export const useWatchlistStore = defineStore("watchlist", () => {
	const watchlist = ref<StockSymbolForDisplay[]>([]);

	const googleStore = useGoogleStore();
	const stockStore = useStocksStore();

	async function init(watchlistSymbols?: StockSymbolForDisplay[]) {
		const tempWatchlist = watchlistSymbols || [];

		for (let item of tempWatchlist) {
			const quote = await stockStore.getStockQuote(item.source, item.symbol);
			if (!quote) console.error(`Failed to fetch quote for ${item.symbol}`);
			item.price = quote?.current;
			item.openPrice = quote?.open;
		}

		watchlist.value = tempWatchlist
	}

	function isInWatchlist(symbol: StockSymbolForDisplay) {
		return watchlist.value.some((s) => s.symbol === symbol.symbol);
	}

	async function addToWatchlist(item: StockSymbolForDisplay) {
		const quote = await stockStore.getStockQuote(item.source, item.symbol);
		if (!quote) console.error(`Failed to fetch quote for ${item.symbol}`);

		item.price = quote?.current;
		item.openPrice = quote?.open;

		watchlist.value.push(item);
		console.log("synced from addToWatchlist");
		googleStore.syncData();
	}

	function removeFromWatchlist(item: StockSymbolForDisplay) {
		watchlist.value = watchlist.value.filter((s) => s.symbol !== item.symbol);
		console.log("synced from removeFromWatchlist");
		googleStore.syncData();
	}

	return { init, isInWatchlist, addToWatchlist, removeFromWatchlist, watchlist };
});
