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
window.fetch = async (...args) => {
	loadingStore.start();
	try {
		return await originalFetch(...args);
	} finally {
		loadingStore.stop();
	}
};

app.mount("#app");
