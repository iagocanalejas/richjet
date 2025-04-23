<template>
	<div class="flex items-center space-x-3">
		<img :src="item.image" alt="Icon" class="w-6 h-6 object-contain" />
		<span class="text-sm font-medium tracking-wide text-white">
			{{ item.symbol }}
		</span>
	</div>
	<div class="text-sm text-right text-white">--</div>
	<div class="text-sm text-right text-white">--</div>
	<div class="text-sm text-right" :class="magicClass(winOrLoss)">
		{{ formatCurrency(winOrLoss, currency) }}
	</div>
	<div class="text-sm text-right" :class="magicClass(rentability)">
		{{ rentability.toFixed(2) }} %
	</div>
</template>

<script lang="ts" setup>
import { useSettingsStore } from "@/stores/settings";
import type { PortfolioItem } from "@/types/stock";
import { formatCurrency, magicClass } from "@/types/utils";
import { storeToRefs } from "pinia";
import { computed } from "vue";

const props = defineProps({
	item: { type: Object as () => PortfolioItem, required: true },
});

const { currency } = storeToRefs(useSettingsStore());

const winOrLoss = computed(() => {
	return props.item.totalRetrieved - (props.item.totalInverted + props.item.comission);
});

const rentability = computed(() => {
	const totalPayed = props.item.totalInverted + props.item.comission;
	return ((props.item.totalRetrieved - totalPayed) / totalPayed) * 100;
});
</script>
