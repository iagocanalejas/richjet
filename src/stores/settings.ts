import type { Settings } from "@/types/google";
import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { useGoogleStore } from "./google";

export const useSettingsStore = defineStore("settings", () => {
    const googleStore = useGoogleStore();

    const _settings = ref<Settings>({ currency: "USD" });
    const conversionRate = ref<number>(1.0);

    const currency = computed({
        get() {
            return _settings.value.currency;
        },
        async set(currency: string) {
            _settings.value.currency = currency;
            console.log("synced from set currency");
            googleStore.syncData();
            await _getConvertionRate(currency);
        },
    });

    async function init(settings?: Settings) {
        if (settings) {
            _settings.value = settings;
        } else {
            console.log("synced from init settings");
            googleStore.syncData();
        }
        await _getConvertionRate(_settings.value.currency);
    }

    async function _getConvertionRate(currency: string) {
        if (currency === "USD") {
            conversionRate.value = 1.0;
        }
        try {
            const url = "https://v6.exchangerate-api.com/v6/";
            const response = await fetch(
                `${url}${import.meta.env.VITE_PUBLIC_EXCHANGERATE_API_KEY}/pair/USD/${currency}`,
                { method: "GET" },
            );
            if (!response.ok) {
                throw new Error("Network response was not ok");
            }
            const data = await response.json();
            conversionRate.value = data.conversion_rate;
        } catch (error) {
            console.error("Error fetching conversion rate:", error);
        }
    }

    return { init, currency, conversionRate, settings: _settings };
});
