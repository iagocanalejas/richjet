import "./assets/main.css";

import { createApp } from "vue";
import { createPinia } from "pinia";

import App from "./App.vue";
import router from "./router";
import { useWatchlistStore } from "./stores/shares";
import { useTransactionStore } from "./stores/transactions";

const pinia = createPinia();
useWatchlistStore(pinia)._loadWatchlist(); // Initialize the shares store
useTransactionStore(pinia)._loadTransaction(); // Initialize the transactions store

const app = createApp(App);
app.use(pinia);
app.use(router);

app.mount("#app");
