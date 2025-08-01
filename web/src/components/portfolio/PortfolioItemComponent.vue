<template>
    <div class="flex items-center space-x-3">
        <img v-show="item.symbol.picture" :src="item.symbol.picture" alt="Icon" class="w-6 h-6 object-contain" />
        <div class="flex flex-col">
            <span class="text-sm font-medium tracking-wide text-white">
                {{ item.symbol.ticker }}
            </span>
            <span v-if="item.symbol.name" class="text-xs text-gray-400">
                {{ item.symbol.name }}
            </span>
        </div>
    </div>
    <div class="text-sm text-right">
        <div :class="textColorByRentability(rentability, !!item.symbol.manual_price)">
            {{ formatCurrency(item.currentPrice, currency) }}
        </div>
        <div class="text-xs text-gray-400">
            ({{ formatCurrency((item.currentInvested + item.commission) / item.quantity, currency) }})
        </div>
    </div>
    <div class="text-sm text-right text-white">
        {{ item.quantity }}
    </div>
    <div class="text-sm text-right">
        <div :class="textColorByRentability(rentability, !!item.symbol.manual_price)">
            {{ formatCurrency(item.currentPrice * item.quantity, currency) }}
        </div>
        <div class="text-xs text-gray-400">
            ({{ formatCurrency(item.currentInvested + item.commission, currency) }})
        </div>
    </div>
    <div class="text-sm text-right" :class="textColorByRentability(rentability, !!item.symbol.manual_price)">
        {{ rentability.toFixed(2) }} %
    </div>
    <button class="text-gray-400 hover:text-white" title="Options">⋮</button>
</template>

<script lang="ts" setup>
import { useSettingsStore } from '@/stores/settings';
import type { PortfolioItem } from '@/types/portfolio';
import { formatCurrency } from '@/utils/utils';
import { textColorByRentability } from '@/utils/styles';
import { storeToRefs } from 'pinia';
import { computed } from 'vue';

const props = defineProps({
    item: { type: Object as () => PortfolioItem, required: true },
});

const { currency } = storeToRefs(useSettingsStore());

const rentability = computed(() => {
    const buyPrice = props.item.currentInvested + props.item.commission;
    return ((props.item.currentPrice * props.item.quantity - buyPrice) / buyPrice) * 100;
});
</script>
