import "./assets/main.css";

import { createApp } from "vue";
import { createPinia } from "pinia";

import App from "./App.vue";
import router from "./router";
import { useWatchlistStore } from "./stores/shares";
import { useTransactionStore } from "./stores/transactions";
import { usePortfolioStore } from "./stores/portfolio";

const pinia = createPinia();
useWatchlistStore(pinia)._loadWatchlist(); // Initialize the shares store
useTransactionStore(pinia)._loadTransaction(); // Initialize the transactions store
usePortfolioStore(pinia)._loadPortfolio(); // Initialize the portfolio store

const app = createApp(App);
app.use(pinia);
app.use(router);

app.mount("#app");
