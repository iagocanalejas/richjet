<template>
    <div v-if="props.values.length" class="mt-6 w-full">
        <div class="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-4 px-4 py-2 text-sm font-semibold text-white">
            <div>Asset</div>
            <div class="text-right">Avg Price</div>
            <div class="text-right">Quantity</div>
            <div class="text-right">Total</div>
            <div class="text-right">Rentability</div>
        </div>
        <ul class="space-y-4">
            <li
                v-for="item in props.values"
                :key="item.symbol"
                class="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-4 items-center bg-gray-800 p-4 rounded-lg cursor-pointer"
            >
                <div class="flex items-center space-x-3">
                    <img :src="item.image" alt="Icon" class="w-6 h-6 object-contain" />
                    <span class="text-sm font-medium tracking-wide text-white">
                        {{ item.symbol }}
                    </span>
                </div>
                <div class="text-sm text-right">
                    <div
                        :class="{
                            'text-green-400': rentability(item) > 0,
                            'text-red-400': rentability(item) < 0,
                            'text-white': rentability(item) === 0,
                        }"
                    >
                        {{ item.currentPrice.toFixed(2) }} €
                    </div>
                    <div class="text-xs text-gray-400">({{ (item.totalPrice / item.quantity).toFixed(2) }} €)</div>
                </div>
                <div class="text-sm text-right text-white">
                    {{ item.quantity }}
                </div>
                <div class="text-sm text-right">
                    <div
                        :class="{
                            'text-green-400': rentability(item) > 0,
                            'text-red-400': rentability(item) < 0,
                            'text-white': rentability(item) === 0,
                        }"
                    >
                        {{ (item.currentPrice * item.quantity).toFixed(2) }} €
                    </div>
                    <div class="text-xs text-gray-400">({{ item.totalPrice.toFixed(2) }} €)</div>
                </div>
                <div
                    class="text-sm text-right"
                    :class="{
                        'text-green-400': rentability(item) > 0,
                        'text-red-400': rentability(item) < 0,
                        'text-white': rentability(item) === 0,
                    }"
                >
                    {{ rentability(item).toFixed(2) }} %
                </div>
            </li>
        </ul>
    </div>

    <div v-else class="mt-6 w-full text-center text-gray-500">
        <p class="text-sm">No results found.</p>
    </div>
</template>

<script lang="ts" setup>
import type { PortfolioItem } from "@/types/finnhub";

const props = defineProps({
    values: { type: Array as () => PortfolioItem[], default: () => [] },
});

function rentability(item: PortfolioItem) {
    return ((item.currentPrice * item.quantity - item.totalPrice) / item.totalPrice) * 100;
}
</script>
