import type { GoogleUser } from "@/types/google";
import { defineStore } from "pinia";
import { computed, ref } from "vue";

type Settings = {
    currency: string;
    token?: google.accounts.oauth2.TokenResponse;
    user?: GoogleUser;
};

export const useSettingsStore = defineStore("settings", () => {
    const API_KEY = import.meta.env.VITE_EXCHANGERATE_API_KEY;

    const _settings = ref<Settings>({ currency: "USD" });
    const conversionRate = ref<number>(1.0);

    const currency = computed({
        get() {
            return _settings.value.currency;
        },
        async set(currency: string) {
            _settings.value.currency = currency;
            localStorage.setItem("settings", JSON.stringify(_settings.value));
            await _getConvertionRate(currency);
        },
    });

    const auth_token = computed(() => _settings.value.token);
    const user = computed(() => _settings.value.user);

    async function init() {
        console.log("loading settings from localStorage");
        const storedSettings = localStorage.getItem("settings");
        if (storedSettings) {
            _settings.value = JSON.parse(storedSettings);
            await _getConvertionRate(_settings.value.currency);
        } else {
            localStorage.setItem("settings", JSON.stringify(_settings.value));
        }
    }

    function updateGoogleData(token?: google.accounts.oauth2.TokenResponse, user?: GoogleUser) {
        _settings.value.token = token;
        _settings.value.user = user;
        localStorage.setItem("settings", JSON.stringify(_settings.value));
    }

    async function _getConvertionRate(currency: string) {
        if (currency === "USD") {
            conversionRate.value = 1.0;
        }
        try {
            const url = "https://v6.exchangerate-api.com/v6/";
            const response = await fetch(`${url}${API_KEY}/pair/USD/${currency}`, { method: "GET" });
            if (!response.ok) {
                throw new Error("Network response was not ok");
            }
            const data = await response.json();
            conversionRate.value = data.conversion_rate;
        } catch (error) {
            console.error("Error fetching conversion rate:", error);
        }
    }

    return { init, currency, conversionRate, googleUser: user, auth_token, updateGoogleData };
});
