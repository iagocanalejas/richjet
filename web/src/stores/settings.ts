import type { Settings, Account } from "@/types/google";
import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { useGoogleStore } from "./google";

export const useSettingsStore = defineStore("settings", () => {
	const BASE_URL = import.meta.env.VITE_BACKEND_BASE_URL;
	const googleStore = useGoogleStore();

	const _settings = ref<Settings>({ currency: "USD", accounts: [] });
	const conversionRate = ref<number>(1.0);
	const account = ref<Account | undefined>();

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

	const accounts = computed({
		get() {
			return _settings.value.accounts;
		},
		set(accounts: Account[]) {
			_settings.value.accounts = accounts;
			console.log("synced from set accounts");
			googleStore.syncData();
		},
	});

	async function init(settings?: Settings) {
		if (settings) {
			_settings.value = { ..._settings.value, ...settings };
		} else {
			console.log("synced from init settings");
			googleStore.syncData();
		}
		await _getConvertionRate(_settings.value.currency);
	}

	async function _getConvertionRate(currency: string) {
		if (currency === "USD") {
			conversionRate.value = 1.0;
			return;
		}
		try {
			const response = await fetch(`${BASE_URL}/exchangerate/${currency}`, { method: "GET" });
			if (!response.ok) throw new Error("Network response was not ok");

			const data = await response.json();
			conversionRate.value = data.conversion_rate;
		} catch (error) {
			console.error("Error fetching conversion rate:", error);
		}
	}

	return { init, currency, accounts, account, conversionRate, settings: _settings };
});
