<template>
    <div class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center px-4">
        <div class="w-full max-w-md bg-gray-900 text-white rounded-2xl shadow-2xl p-6 space-y-6 animate-fadeIn">
            <div class="text-center space-y-1">
                <h2 class="text-xl font-bold tracking-wide">New Prices</h2>
            </div>

            <div class="space-y-4">
                <div v-for="item in newPrices" :key="item.symbol.id" class="flex items-center justify-between gap-4">
                    <span class="font-medium">{{ item.symbol.display_name }}</span>
                    <div class="relative group">
                        <input
                            type="text"
                            inputmode="decimal"
                            pattern="[0-9]*[.,]?[0-9]*"
                            v-model="item.str_price"
                            @input="handlePriceChange(item)"
                            class="w-28 bg-gray-800 text-white border rounded-md px-2 py-1 text-right focus:outline-none focus:ring-2"
                            :class="classForItem(item)"
                        />
                        <div
                            v-if="item.error"
                            class="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover:block bg-red-600 text-white text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap z-10"
                        >
                            {{ item.error }}
                        </div>
                    </div>
                </div>
            </div>

            <div class="flex flex-col gap-2 pt-2">
                <button
                    @click="save()"
                    class="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-md text-sm font-semibold transition"
                >
                    Update Balance
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
import type { StockSymbol } from '@/types/stock';
import { normalizeDecimalInput } from '@/utils/utils';
import { ref, watch, type PropType } from 'vue';

const props = defineProps({ values: { type: Array as PropType<PortfolioItem[]>, required: true } });

const emit = defineEmits(['save', 'close']);

const newPrices = ref<ItemType[]>(
    props.values.map((i) => ({
        symbol: i.symbol,
        price: i.symbol.manual_price ?? 0,
        str_price: (i.symbol.manual_price ?? 0).toString(),
        edited: false,
        error: '',
    }))
);
watch(
    () => props.values,
    (newVal) => {
        newPrices.value = newVal.map((i) => ({
            symbol: i.symbol,
            price: i.symbol.manual_price ?? 0,
            str_price: (i.symbol.manual_price ?? 0).toString(),
            edited: false,
            error: '',
        }));
    },
    { immediate: true }
);

function classForItem(item: ItemType) {
    if (item.error) return 'border-red-500 focus:ring-red-500';
    if (item.edited) return 'border-green-400 focus:ring-green-500';
    return 'border-gray-700 focus:ring-green-500';
}

function handlePriceChange(item: ItemType) {
    const original = props.values.find((v) => v.symbol.id === item.symbol.id)?.symbol.manual_price;
    item.edited = normalizeDecimalInput(item.str_price) !== original;
    item.price = normalizeDecimalInput(item.str_price);
}

function save() {
    if (!newPrices.value.some((i) => i.edited)) return;
    for (const item of newPrices.value) {
        if (!item.edited) continue;
        item.error = '';
        if (isNaN(item.price) || item.price <= 0) {
            item.error = 'Price must be a positive number.';
        }
    }
    if (newPrices.value.some((i) => i.error)) return;

    emit(
        'save',
        newPrices.value.filter((i) => i.edited).map((i) => ({ symbol_id: i.symbol.id, price: i.price }))
    );
}

function close() {
    emit('close');
}

type ItemType = { symbol: StockSymbol; price: number; str_price: string; edited: boolean; error: string };
</script>
