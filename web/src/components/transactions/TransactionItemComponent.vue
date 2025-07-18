<template>
    <div class="absolute top-0 left-4 -translate-y-1/2 bg-gray-600 text-white text-xs px-2 py-0.5 rounded shadow">
        {{ item.account?.name ?? 'N/A' }}
    </div>
    <div class="flex items-center space-x-3">
        <img v-show="item.symbol.picture" :src="item.symbol.picture" class="w-6 h-6 object-contain" alt="Icon" />
        <span class="text-sm font-medium tracking-wide text-white">
            {{ item.symbol.ticker }}
        </span>
    </div>

    <div class="text-sm text-right">{{ formatDate(item.date) }}</div>
    <div class="text-sm text-right">{{ item.price ? formatCurrency(item.price, currency) : '---' }}</div>
    <div class="text-sm text-right">{{ item.quantity ? item.quantity : '---' }}</div>

    <div v-if="isDividend(item.transaction_type)" class="text-sm text-right">---</div>
    <div v-else class="text-sm text-right">{{ formatCurrency(item.quantity * item.price, currency) }}</div>

    <div class="text-gray-400 text-right">
        <button @click="emit('remove', item)" class="hover:text-red-500 transition-colors" title="Remove">
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
    </div>
</template>

<script lang="ts" setup>
import { useSettingsStore } from '@/stores/settings';
import type { TransactionItem } from '@/types/portfolio';
import { formatCurrency, formatDate } from '@/utils/utils';
import { storeToRefs } from 'pinia';
import { isDividend } from '@/utils/rules';

defineProps({
    item: { type: Object as () => TransactionItem, required: true },
});

const emit = defineEmits(['remove']);

const { currency } = storeToRefs(useSettingsStore());
</script>
