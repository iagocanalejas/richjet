<template>
    <!-- Desktop row layout -->
    <div class="hidden md:flex items-center space-x-3">
        <img v-show="item.symbol.picture" :src="item.symbol.picture" class="w-6 h-6 object-contain" alt="Icon" />
        <div class="flex flex-col">
            <div class="flex items-baseline gap-1">
                <span class="text-sm font-medium tracking-wide text-white">{{ item.symbol.display_name }}</span>
                <span class="text-xs text-gray-400 self-center">({{ item.symbol.ticker }})</span>
            </div>
            <span v-if="item.symbol.name" class="text-xs text-gray-400">{{ item.symbol.name }}</span>
        </div>
    </div>

    <div class="hidden md:block text-sm text-right text-white">--</div>
    <div class="hidden md:block text-sm text-right text-white">--</div>

    <div
        class="hidden md:block text-sm text-right"
        :class="textColorByRentability(winOrLoss, item.symbol.is_manual_price)"
    >
        {{ formatCurrency(winOrLoss, currency) }}
    </div>

    <div
        class="hidden md:block text-sm text-right"
        :class="textColorByRentability(rentability, item.symbol.is_manual_price)"
    >
        {{ rentability.toFixed(2) }} %
    </div>

    <!-- Mobile card layout -->
    <div class="flex flex-col gap-2 md:hidden">
        <div class="flex items-center gap-2 mb-2">
            <img v-show="item.symbol.picture" :src="item.symbol.picture" class="w-8 h-8 object-contain" alt="Icon" />
            <div>
                <div class="text-sm font-medium text-white">{{ item.symbol.display_name }}</div>
                <div class="text-xs text-gray-400">({{ item.symbol.ticker }})</div>
                <div v-if="item.symbol.name" class="text-xs text-gray-400">{{ item.symbol.name }}</div>
            </div>
        </div>

        <div class="flex justify-between text-sm">
            <span class="text-gray-400 text-xs">Avg Price</span>
            <span>--</span>
        </div>

        <div class="flex justify-between text-sm">
            <span class="text-gray-400 text-xs">Quantity</span>
            <span>--</span>
        </div>

        <div class="flex justify-between text-sm">
            <span class="text-gray-400 text-xs">Win/Loss</span>
            <span :class="textColorByRentability(winOrLoss, item.symbol.is_manual_price)">
                {{ formatCurrency(winOrLoss, currency) }}
            </span>
        </div>

        <div class="flex justify-between text-sm">
            <span class="text-gray-400 text-xs">Rentability</span>
            <span :class="textColorByRentability(rentability, item.symbol.is_manual_price)">
                {{ rentability.toFixed(2) }} %
            </span>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { useSettingsStore } from '@/stores/settings';
import type { PortfolioItem } from '@/types/portfolio';
import { formatCurrency } from '@/utils/utils';
import { textColorByRentability } from '@/utils/styles';
import { storeToRefs } from 'pinia';
import { computed, type PropType } from 'vue';

const props = defineProps({ item: { type: Object as PropType<PortfolioItem>, required: true } });

const { currency } = storeToRefs(useSettingsStore());

const winOrLoss = computed(() => {
    return props.item.total_retrieved - (props.item.total_invested + props.item.commission);
});

const rentability = computed(() => {
    const totalPayed = props.item.total_invested + props.item.commission;
    return ((props.item.total_retrieved - totalPayed) / totalPayed) * 100;
});
</script>
