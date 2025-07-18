<template>
    <div class="flex items-center space-x-3">
        <img
            v-show="item.picture"
            :src="item.picture"
            @error="$emit('image-error')"
            class="w-6 h-6 object-contain"
            alt="Share icon"
        />
        <div class="flex flex-col">
            <div class="flex flex-col sm:flex-row sm:items-center sm:space-x-2">
                <span class="truncate font-medium text-white">{{ item.name }}</span>
                <span class="text-xs text-gray-400">({{ item.ticker }})</span>
            </div>
            <div v-if="item.isin || item.figi" class="flex flex-col sm:flex-row sm:items-center sm:space-x-2">
                <div v-if="item.isin" class="text-xs text-gray-300 sm:mt-0.5">ISIN: {{ item.isin }}</div>
                <div v-if="item.figi" class="text-xs text-gray-300 sm:mt-0.5">FIGI: {{ item.figi }}</div>
            </div>
        </div>
    </div>

    <div class="flex items-center space-x-2 relative">
        <div v-if="item.price" class="flex items-center text-sm me-5">
            <div class="text-right" :class="textColorByRentability(item.price - item.openPrice!)">
                <div class="font-semibold">{{ formatCurrency(item.price, currency, conversionRate) }}</div>
                <div class="text-xs">
                    {{ item.price - item.openPrice! > 0 ? '+' : '' }}
                    {{ (((item.price - item.openPrice!) / item.openPrice!) * 100).toFixed(2) }}%
                </div>
            </div>
        </div>

        <button
            v-if="!item.isFavorite || item.id"
            @click.stop="emit('favorite', item)"
            class="text-gray-400 hover:text-red-500 transition-colors"
            :title="item.isFavorite ? 'Unfavorite' : 'Favorite'"
        >
            <svg
                v-if="item.isFavorite"
                xmlns="http://www.w3.org/2000/svg"
                fill="currentColor"
                viewBox="0 0 24 24"
                class="w-5 h-5"
            >
                <path
                    d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2
						5.42 4.42 3 7.5 3c1.74 0 3.41 0.81 4.5
						2.09C13.09 3.81 14.76 3 16.5 3 19.58 3
						22 5.42 22 8.5c0 3.78-3.4 6.86-8.55
						11.54L12 21.35z"
                />
            </svg>
            <svg
                v-else
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
                    d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2
							5.42 4.42 3 7.5 3c1.74 0 3.41 0.81 4.5
							2.09C13.09 3.81 14.76 3 16.5 3 19.58 3
							22 5.42 22 8.5c0 3.78-3.4 6.86-8.55
							11.54L12 21.35z"
                />
            </svg>
        </button>
        <button class="text-gray-400 hover:text-white" title="Options">⋮</button>
    </div>
</template>

<script lang="ts" setup>
import { useSettingsStore } from '@/stores/settings';
import { type StockSymbolForDisplay } from '@/types/stock';
import { formatCurrency } from '@/utils/utils';
import { textColorByRentability } from '@/utils/styles';
import { storeToRefs } from 'pinia';

defineProps({
    item: { type: Object as () => StockSymbolForDisplay, required: true },
});

const emit = defineEmits(['favorite', 'image-error']);

const { currency, conversionRate } = storeToRefs(useSettingsStore());
</script>
