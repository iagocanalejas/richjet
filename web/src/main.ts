import "./assets/main.css";

import { createApp } from "vue";
import { createPinia } from "pinia";

import App from "./App.vue";
import router from "./router";
import { useLoadingStore } from "./stores/loading";

const pinia = createPinia();
const app = createApp(App);
app.use(pinia);
app.use(router);

// monkey patch fetch to use loading store
const loadingStore = useLoadingStore(pinia);
const originalFetch = window.fetch;

// @ts-ignore
window.fetch = async (resource: RequestInfo, options: RequestInit & { timeout?: number } = {}) => {
	const { timeout = 5000, ...rest } = options;

	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort('⏱️ Request timed out'), timeout);

	loadingStore.start();

	try {
		return await originalFetch(resource, { ...rest, signal: controller.signal });
	} finally {
		clearTimeout(timeoutId);
		loadingStore.stop();
	}
};

app.mount("#app");
