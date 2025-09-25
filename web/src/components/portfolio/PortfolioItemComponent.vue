<template>
    <!-- Desktop row layout -->
    <div class="hidden md:flex items-center space-x-3">
        <img v-show="item.symbol.picture" :src="item.symbol.picture" alt="Icon" class="w-6 h-6 object-contain" />
        <div class="flex flex-col">
            <div class="flex items-baseline gap-1">
                <span class="text-sm font-medium tracking-wide text-white">{{ item.symbol.display_name }}</span>
                <span class="text-xs text-gray-400 self-center">({{ item.symbol.ticker }})</span>
            </div>
            <span v-if="item.symbol.name" class="text-xs text-gray-400">{{ item.symbol.name }}</span>
        </div>
    </div>

    <div class="hidden md:block text-sm text-right">
        <div :class="textColorByRentability(rentability, !!item.symbol.manual_price)">
            {{ formatCurrency(item.currentPrice, currency) }}
        </div>
        <div class="text-xs text-gray-400">
            ({{ formatCurrency((item.currentInvested + item.commission) / item.quantity, currency) }})
        </div>
    </div>

    <div class="hidden md:block text-sm text-right text-white">
        {{ Number(item.quantity).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 }) }}
    </div>

    <div class="hidden md:block text-sm text-right">
        <div :class="textColorByRentability(rentability, !!item.symbol.manual_price)">
            {{ formatCurrency(item.currentPrice * item.quantity, currency) }}
        </div>
        <div class="text-xs text-gray-400">
            ({{ formatCurrency(item.currentInvested + item.commission, currency) }})
        </div>
    </div>

    <div
        class="hidden md:block text-sm text-right"
        :class="textColorByRentability(rentability, !!item.symbol.manual_price)"
    >
        {{ rentability.toFixed(2) }} %
    </div>

    <button class="hidden md:inline text-gray-400 hover:text-white" title="Options">⋮</button>

    <!-- Mobile card layout -->
    <div class="flex flex-col gap-2 md:hidden">
        <div class="flex justify-between items-start mb-2">
            <div class="flex items-center gap-2">
                <img
                    v-show="item.symbol.picture"
                    :src="item.symbol.picture"
                    alt="Icon"
                    class="w-8 h-8 object-contain"
                />
                <div>
                    <div class="text-sm font-medium text-white">
                        {{ item.symbol.display_name }}
                    </div>
                    <div class="text-xs text-gray-400">({{ item.symbol.ticker }})</div>
                    <div v-if="item.symbol.name" class="text-xs text-gray-400">{{ item.symbol.name }}</div>
                </div>
            </div>

            <button class="text-gray-400 hover:text-white" title="Options">⋮</button>
        </div>

        <div class="flex justify-between text-sm">
            <span class="text-gray-400 text-xs">Avg Price</span>
            <span class="text-xs">
                {{ formatCurrency((item.currentInvested + item.commission) / item.quantity, currency) }}
            </span>
        </div>

        <div class="flex justify-between text-sm">
            <span class="text-gray-400 text-xs">Current Price</span>
            <span :class="textColorByRentability(rentability, !!item.symbol.manual_price)">
                {{ formatCurrency(item.currentPrice, currency) }}
            </span>
        </div>

        <div class="flex justify-between text-sm">
            <span class="text-gray-400 text-xs">Quantity</span>
            <span>
                {{
                    Number(item.quantity).toLocaleString(undefined, {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 2,
                    })
                }}
            </span>
        </div>

        <div class="flex justify-between text-sm">
            <span class="text-gray-400 text-xs">Value</span>
            <span :class="textColorByRentability(rentability, !!item.symbol.manual_price)">
                {{ formatCurrency(item.currentPrice * item.quantity, currency) }}
            </span>
        </div>

        <div class="flex justify-between text-sm">
            <span class="text-gray-400 text-xs">Invested</span>
            <span class="text-xs">
                {{ formatCurrency(item.currentInvested + item.commission, currency) }}
            </span>
        </div>

        <div class="flex justify-between text-sm">
            <span class="text-gray-400 text-xs">Rentability</span>
            <span :class="textColorByRentability(rentability, !!item.symbol.manual_price)">
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

const rentability = computed(() => {
    const buyPrice = props.item.currentInvested + props.item.commission;
    return ((props.item.currentPrice * props.item.quantity - buyPrice) / buyPrice) * 100;
});
</script>
