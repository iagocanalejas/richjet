<template>
    <div class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center px-4">
        <div class="w-full max-w-md bg-gray-900 text-white rounded-2xl shadow-2xl p-6 space-y-6 animate-fadeIn">
            <div class="text-center space-y-1">
                <h2 class="text-xl font-bold tracking-wide">New price for {{ item.symbol.ticker }}</h2>
                <p class="text-sm text-gray-400">{{ item.symbol.security_type }}</p>
            </div>

            <div class="space-y-4">
                <div>
                    <label class="block text-sm font-medium text-gray-300 mb-1">Price</label>
                    <input
                        v-model="priceInput"
                        type="text"
                        inputmode="decimal"
                        pattern="[0-9]*[.,]?[0-9]*"
                        class="w-full bg-gray-800 text-white px-3 py-2 rounded-lg border border-gray-700 focus:outline-none focus:ring-2"
                        @input="price = normalizePriceInput(priceInput)"
                        :class="{
                            'border-red-500 focus:ring-red-500': $errors.price,
                            'border-gray-700 focus:ring-blue-500': !$errors.price,
                        }"
                    />
                    <p v-if="$errors.price" class="mt-1 text-sm text-red-400">{{ $errors.price }}</p>
                </div>
            </div>

            <div class="flex flex-col gap-2 pt-2">
                <button
                    @click="save()"
                    class="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-md text-sm font-semibold transition"
                >
                    Set Price
                </button>
                <button
                    @click="close()"
                    class="w-full bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-md text-sm font-semibold transition"
                >
                    Cancel
                </button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import type { PortfolioItem } from '@/types/portfolio';
import { normalizePriceInput } from '@/utils/utils';
import { ref } from 'vue';

const props = defineProps({
    item: { type: Object as () => PortfolioItem, required: true },
});

const emit = defineEmits(['set-price', 'close']);

const priceInput = ref('');
const price = ref(0);
const $errors = ref<{ price?: string }>({});

function save() {
    $errors.value = {};
    if (price.value <= 0) {
        $errors.value.price = 'Price must be greater than 0.';
        return;
    }
    emit('set-price', { symbol_id: props.item.symbol.id, price: price.value });
}

function close() {
    $errors.value = {};
    emit('close');
}
</script>
