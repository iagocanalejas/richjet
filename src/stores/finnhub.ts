import { defineStore, storeToRefs } from "pinia";
import { type FinnhubStockQuote, type FinnhubStockSymbol } from "@/types/finnhub";
import { useSettingsStore } from "./settings";

export const useFinnhubStore = defineStore("finnhub", () => {
    const BASE_URL = "https://finnhub.io/api/v1";
    const API_KEY = import.meta.env.VITE_FINNHUB_API_KEY;

    const { conversionRate } = storeToRefs(useSettingsStore());

    async function symbolSearch(query: string) {
        try {
            const response = await fetch(`${BASE_URL}/search?q=${query}&token=${API_KEY}`, { method: "GET" });
            if (!response.ok) {
                throw new Error("Network response was not ok");
            }

            const data: { count: number; result: FinnhubStockSymbol[] } = await response.json();
            return data.result;
        } catch (error) {
            console.error("Error fetching stock symbols:", error);
        }
    }

    async function getStockQuote(symbol: string) {
        try {
            const response = await fetch(`${BASE_URL}/quote?symbol=${symbol}&token=${API_KEY}`, { method: "GET" });
            if (!response.ok) {
                throw new Error("Network response was not ok");
            }
            const data: FinnhubStockQuote = await response.json();
            return {
                c: data.c * conversionRate.value,
                h: data.h * conversionRate.value,
                l: data.l * conversionRate.value,
                o: data.o * conversionRate.value,
                pc: data.pc * conversionRate.value,
            };
        } catch (error) {
            console.error("Error fetching stock quote:", error);
        }
    }

    return { symbolSearch, getStockQuote };
});
