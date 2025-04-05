import { defineStore } from "pinia";
import { type FinnhubStockSymbol } from "@/types/finnhub";

export const useFinnhubStore = defineStore("finnhub", () => {
    const BASE_URL = "https://finnhub.io/api/v1";
    const API_KEY = import.meta.env.VITE_FINNHUB_API_KEY;

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

    return { symbolSearch };
});
