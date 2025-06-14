<template>
    <div class="flex items-center space-x-3">
        <img
            v-show="!hideImage"
            :src="item.symbol.picture"
            :key="item.hideImage ? 'error' : 'ok'"
            @error="hideImage = true"
            class="w-6 h-6 object-contain"
            alt="Icon"
        />
        <span class="text-sm font-medium tracking-wide text-white">
            {{ item.symbol.ticker }}
        </span>
    </div>
    <div class="text-sm text-right text-white">--</div>
    <div class="text-sm text-right text-white">--</div>
    <div class="text-sm text-right" :class="textColorByRentability(winOrLoss, item.manualInputedPrice)">
        {{ formatCurrency(winOrLoss, currency) }}
    </div>
    <div class="text-sm text-right" :class="textColorByRentability(rentability, item.manualInputedPrice)">
        {{ rentability.toFixed(2) }} %
    </div>
</template>

<script lang="ts" setup>
import { useSettingsStore } from '@/stores/settings';
import type { PortfolioItem } from '@/types/portfolio';
import { formatCurrency } from '@/utils/utils';
import { textColorByRentability } from '@/utils/styles';
import { storeToRefs } from 'pinia';
import { computed, ref } from 'vue';

const props = defineProps({
    item: { type: Object as () => PortfolioItem, required: true },
});

const { currency } = storeToRefs(useSettingsStore());
const hideImage = ref(false);

const winOrLoss = computed(() => {
    return props.item.totalRetrieved - (props.item.totalInvested + props.item.commission);
});

const rentability = computed(() => {
    const totalPayed = props.item.totalInvested + props.item.commission;
    return ((props.item.totalRetrieved - totalPayed) / totalPayed) * 100;
});
</script>
