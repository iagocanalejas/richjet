import "./assets/main.css";

import { createApp } from "vue";
import { createPinia } from "pinia";

import App from "./App.vue";
import router from "./router";
import { useWatchlistStore } from "./stores/shares";
import { useTransactionStore } from "./stores/transactions";
import { usePortfolioStore } from "./stores/portfolio";
import { useSettingsStore } from "./stores/settings";

const pinia = createPinia();
await useSettingsStore(pinia).init();
useWatchlistStore(pinia).init(); // Initialize the shares store
useTransactionStore(pinia).init(); // Initialize the transactions store
usePortfolioStore(pinia).init(); // Initialize the portfolio store

const app = createApp(App);
app.use(pinia);
app.use(router);

app.mount("#app");
