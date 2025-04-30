import { defineStore } from "pinia";
import { type StockQuote, type StockSymbol } from "@/types/stock";

export const useStocksStore = defineStore("stocks", () => {
	const BASE_URL = import.meta.env.VITE_BACKEND_BASE_URL;

	const quoteCache = new Map<string, StockQuote>();

	async function symbolSearch(query: string) {
		try {
			const response = await fetch(`${BASE_URL}/search?q=${query}`, { method: "GET" });
			if (!response.ok) throw new Error("Network response was not ok");

			const data = await response.json();
			if (data.errors?.length) throw new Error(data.errors.join(", "));

			const results = data.results as StockSymbol[];

			if (results.some(s => !s.symbol.includes("."))) {
				// filter out symbols with a dot
				return results.filter(s =>
					!s.symbol.includes(".") &&
					!/^-?\d+X SHORT\b/.test(s.name) &&
					!/^-?\d+X LONG\b/.test(s.name) &&
					!/^LS \d+X\b/.test(s.name)
				);
			}
			return results;
		} catch (error) {
			console.error(error);
		}
	}

	async function getStockQuote(source: string, symbol: string) {
		if (quoteCache.has(symbol)) return quoteCache.get(symbol)!;

		try {
			const response = await fetch(`${BASE_URL}/quote/${source}/${symbol}`, { method: "GET" });
			if (!response.ok) throw new Error("Network response was not ok");

			let data = await response.json();
			if (data.errors?.length) throw new Error(data.errors.join(", "));

			data = {
				current: data.current,
				high: data.high,
				low: data.low,
				open: data.open,
				previpus_close: data.previpus_close,
			};
			quoteCache.set(symbol, data);
			return data as StockQuote;
		} catch (error) {
			console.error(error);
		}
	}

	return { symbolSearch, getStockQuote };
});
