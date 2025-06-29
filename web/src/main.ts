import './assets/main.css';

import { createApp } from 'vue';
import { createPinia } from 'pinia';

import App from './App.vue';
import router from './router';
import { useLoadingStore } from './stores/loading';

const pinia = createPinia();
const app = createApp(App);
app.use(pinia);
app.use(router);

// monkey patch fetch to use loading store
const loadingStore = useLoadingStore(pinia);
const originalFetch = window.fetch;

const wakeUpTimeout = window.setTimeout(() => {
    loadingStore.isFirstLoadCompleted = false;
}, 3000);

// @ts-expect-error: unmatched function signature
window.fetch = async (resource: RequestInfo, options: RequestInit & { timeout?: number } = {}) => {
    const { timeout = 30000, ...rest } = options;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(`⏱️ Request ${resource} timed out`), timeout);

    loadingStore.start();

    try {
        return await originalFetch(resource, { ...rest, signal: controller.signal });
    } finally {
        clearTimeout(timeoutId);
        clearTimeout(wakeUpTimeout);
        loadingStore.isFirstLoadCompleted = true;
        loadingStore.stop();
    }
};

app.mount('#app');
