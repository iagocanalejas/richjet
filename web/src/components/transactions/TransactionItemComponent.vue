<template>
    <div class="absolute top-0 left-4 -translate-y-1/2 bg-gray-600 text-white text-xs px-2 py-0.5 rounded shadow">
        {{ item.account?.name ?? 'N/A' }}
    </div>

    <!-- Desktop layout (grid style) -->
    <div class="hidden md:flex items-center space-x-3">
        <img v-show="item.symbol.picture" :src="item.symbol.picture" class="w-6 h-6 object-contain" alt="Icon" />
        <div class="flex items-baseline gap-1">
            <span class="text-sm font-medium tracking-wide text-white">
                {{ item.symbol.display_name }}
            </span>
            <span class="text-xs text-gray-400 self-center"> ({{ item.symbol.ticker }}) </span>
        </div>
    </div>

    <div class="hidden md:block text-sm text-right">
        {{ formatDate(item.date) }}
    </div>
    <div class="hidden md:block text-sm text-right">
        {{ item.price ? formatCurrency(item.price, currency) : '---' }}
    </div>
    <div class="hidden md:block text-sm text-right">
        {{ item.quantity ? item.quantity : '---' }}
    </div>
    <div class="hidden md:block text-sm text-right">
        {{ !isDividend(item.transaction_type) ? formatCurrency(transactionTotal, currency) : '---' }}
    </div>

    <div class="hidden md:flex items-center justify-end text-gray-400">
        <button @click.stop="emit('remove', item)" class="hover:text-red-500 transition-colors" title="Remove">
            <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                class="w-5 h-5"
            >
                <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M10 12h4M4 6h16M9 6h6a2 2 0 012 2v12a2 2 0
             01-2 2H7a2 2 0 01-2-2V8a2 2 0 012-2z"
                />
            </svg>
        </button>
        <button
            class="text-gray-400 hover:text-white ml-2 flex items-center justify-center"
            title="Options"
            @click.stop="emit('edit', item)"
        >
            ⋮
        </button>
    </div>

    <!-- Mobile layout (card style) -->
    <div class="flex flex-col gap-2 md:hidden">
        <div class="flex justify-between items-start mb-2">
            <div class="flex items-center gap-2">
                <img
                    v-show="item.symbol.picture"
                    :src="item.symbol.picture"
                    class="w-8 h-8 object-contain"
                    alt="Icon"
                />
                <div>
                    <div class="text-sm font-medium text-white">
                        {{ item.symbol.display_name }}
                    </div>
                    <div class="text-xs text-gray-400">({{ item.symbol.ticker }})</div>
                </div>
            </div>

            <div class="flex items-center text-gray-400">
                <button @click.stop="emit('remove', item)" title="Remove">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        class="w-5 h-5"
                    >
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M10 12h4M4 6h16M9 6h6a2 2 0 012 2v12a2 2 0 01-2 2H7a2 2 0 01-2-2V8a2 2 0 012-2z"
                        />
                    </svg>
                </button>
                <button
                    class="text-gray-400 ml-2 flex items-center justify-center"
                    title="Options"
                    @click.stop="emit('edit', item)"
                >
                    ⋮
                </button>
            </div>
        </div>

        <div class="flex justify-between text-sm">
            <span class="text-gray-400 text-xs">Date</span>
            <span>{{ formatDate(item.date) }}</span>
        </div>

        <div class="flex justify-between text-sm">
            <span class="text-gray-400 text-xs">Price</span>
            <span>{{ item.price ? formatCurrency(item.price, currency) : '---' }}</span>
        </div>

        <div class="flex justify-between text-sm">
            <span class="text-gray-400 text-xs">Quantity</span>
            <span>{{ item.quantity ? item.quantity : '---' }}</span>
        </div>

        <div class="flex justify-between text-sm">
            <span class="text-gray-400 text-xs">Total</span>
            <span>
                {{ !isDividend(item.transaction_type) ? formatCurrency(transactionTotal, currency) : '---' }}
            </span>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { useSettingsStore } from '@/stores/settings';
import type { TransactionItem } from '@/types/portfolio';
import { formatCurrency, formatDate } from '@/utils/utils';
import { storeToRefs } from 'pinia';
import { isBuy, isDividend, isSell } from '@/utils/rules';
import { computed, type PropType } from 'vue';

const props = defineProps({ item: { type: Object as PropType<TransactionItem>, required: true } });

const emit = defineEmits(['edit', 'remove']);

const { currency } = storeToRefs(useSettingsStore());
const transactionTotal = computed(() => {
    const { quantity, price, commission } = props.item;
    const base = quantity * price;

    if (isBuy(props.item)) return base + commission;
    if (isSell(props.item)) return base - commission;
    return base;
});
</script>
