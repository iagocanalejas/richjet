<template>
	<div class="flex items-center space-x-3">
		<img v-show="!hideImage" :src="item.image" alt="Icon" class="w-6 h-6 object-contain"
			@error="hideImage = true" />
		<span class="text-sm font-medium tracking-wide text-white">
			{{ item.symbol }}
		</span>
	</div>
	<div class="text-sm text-right text-white">--</div>
	<div class="text-sm text-right text-white">--</div>
	<div class="text-sm text-right" :class="colorClass(winOrLoss, item.manualInputedPrice)">
		{{ formatCurrency(winOrLoss, currency) }}
	</div>
	<div class="text-sm text-right" :class="colorClass(rentability, item.manualInputedPrice)">
		{{ rentability.toFixed(2) }} %
	</div>
</template>

<script lang="ts" setup>
import { useSettingsStore } from "@/stores/settings";
import type { PortfolioItem } from "@/types/stock";
import { formatCurrency, colorClass } from "@/types/utils";
import { storeToRefs } from "pinia";
import { computed, ref } from "vue";

const props = defineProps({
	item: { type: Object as () => PortfolioItem, required: true },
});

const { currency } = storeToRefs(useSettingsStore());
const hideImage = ref(false);

const winOrLoss = computed(() => {
	return props.item.totalRetrieved - (props.item.totalInverted + props.item.comission);
});

const rentability = computed(() => {
	const totalPayed = props.item.totalInverted + props.item.comission;
	return ((props.item.totalRetrieved - totalPayed) / totalPayed) * 100;
});
</script>
