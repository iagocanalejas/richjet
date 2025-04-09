<template>
	<div class="flex items-center space-x-3">
		<img :src="item.image" alt="Icon" class="w-6 h-6 object-contain" />
		<span class="text-sm font-medium tracking-wide text-white">
			{{ item.symbol }}
		</span>
	</div>
	<div class="text-sm text-right text-white">0</div>
	<div class="text-sm text-right text-white">0</div>
	<div class="text-sm text-right" :class="{
		'text-green-400': winOrLoss > 0,
		'text-red-400': winOrLoss < 0,
		'text-white': winOrLoss === 0,
	}">
		{{ winOrLoss.toFixed(2) }} €
	</div>
	<div class="text-sm text-right" :class="{
		'text-green-400': rentability > 0,
		'text-red-400': rentability < 0,
		'text-white': rentability === 0,
	}">
		{{ rentability.toFixed(2) }} %
	</div>
</template>

<script lang="ts" setup>
import type { PortfolioItem } from "@/types/finnhub";
import { computed } from "vue";

const props = defineProps({
	item: { type: Object as () => PortfolioItem, required: true },
});

const winOrLoss = computed(() => {
	return props.item.totalRetrieved - (props.item.totalInverted + props.item.comission);
});

const rentability = computed(() => {
	const totalPayed = props.item.totalInverted + props.item.comission;
	return ((props.item.totalRetrieved - totalPayed) / totalPayed) * 100;
});
</script>
