import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

export const useLoadingStore = defineStore('loading', () => {
    const _loading = ref(0);
    const isLoading = computed(() => _loading.value > 0);

    function start() {
        _loading.value++;
    }
    function stop() {
        if (_loading.value > 0) {
            _loading.value--;
        }
    }

    return { isLoading, start, stop };
});
