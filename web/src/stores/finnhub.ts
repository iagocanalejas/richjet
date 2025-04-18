import { defineStore, storeToRefs } from "pinia";
import { type FinnhubStockQuote, type FinnhubStockSymbol } from "@/types/finnhub";
import { useSettingsStore } from "./settings";

export const useFinnhubStore = defineStore("finnhub", () => {
	const BASE_URL = import.meta.env.VITE_BACKEND_BASE_URL;

	const { conversionRate } = storeToRefs(useSettingsStore());

	const quoteCache = new Map<string, FinnhubStockQuote>();

	async function symbolSearch(query: string) {
		try {
			const response = await fetch(`${BASE_URL}/search?q=${query}`, { method: "GET" });
			if (!response.ok) throw new Error("Network response was not ok");

			const data: { count: number; result: FinnhubStockSymbol[] } = await response.json();
			return data.result;
		} catch (error) {
			console.error("Error fetching stock symbols:", error);
		}
	}

	async function getStockQuote(symbol: string) {
		if (quoteCache.has(symbol)) return quoteCache.get(symbol)!;

		try {
			const response = await fetch(`${BASE_URL}/quote/${symbol}`, { method: "GET" });
			if (!response.ok) throw new Error("Network response was not ok");

			let data: FinnhubStockQuote = await response.json();
			data = {
				c: data.c * conversionRate.value,
				h: data.h * conversionRate.value,
				l: data.l * conversionRate.value,
				o: data.o * conversionRate.value,
				pc: data.pc * conversionRate.value,
			};
			quoteCache.set(symbol, data);
			return data;
		} catch (error) {
			console.error("Error fetching stock quote:", error);
		}
	}

	return { symbolSearch, getStockQuote };
});
