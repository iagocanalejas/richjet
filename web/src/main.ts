import '@vuepic/vue-datepicker/dist/main.css';
import './assets/main.css';

import { createApp } from 'vue';
import { createPinia } from 'pinia';

import App from './App.vue';
import router from './router';
import { useLoadingStore } from './stores/loading';

import VueDatePicker from '@vuepic/vue-datepicker';

const pinia = createPinia();
const app = createApp(App);
app.use(pinia);
app.use(router);

app.component('VueDatePicker', VueDatePicker);

const loadingStore = useLoadingStore(pinia);

const MAX_RETRIES = Infinity;
const RETRY_DELAY = 1000;

const wakeUpTimeout = window.setTimeout(() => {
    loadingStore.isFirstLoadCompleted = false;
}, 3000);

// monkey patch fetch to use loading store
const originalFetch = window.fetch.bind(window);

// @ts-expect-error: unmatched function signature
window.fetch = async function fetchWithRetry(resource: RequestInfo, options: RequestInit & { timeout?: number } = {}) {
    const { timeout = 5000, ...rest } = options;

    let attempt = 0;

    async function tryFetch(): Promise<Response> {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        attempt++;

        try {
            return await originalFetch(resource, {
                ...rest,
                signal: controller.signal,
            });
        } catch (err) {
            const isTimeout =
                err instanceof Error
                    ? err.name === 'AbortError'
                    : err && err instanceof String && err.includes('timed out');

            if (isTimeout && !loadingStore.isFirstLoadCompleted && attempt < MAX_RETRIES) {
                clearTimeout(timeoutId);
                await new Promise((r) => setTimeout(r, RETRY_DELAY));
                return tryFetch();
            }

            throw err;
        } finally {
            clearTimeout(timeoutId);
        }
    }

    loadingStore.start();

    try {
        return await tryFetch();
    } finally {
        clearTimeout(wakeUpTimeout);
        loadingStore.isFirstLoadCompleted = true;
        loadingStore.stop();
    }
};

app.mount('#app');
