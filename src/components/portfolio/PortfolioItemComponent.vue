<template>
	<div class="flex items-center space-x-3">
		<img :src="item.image" alt="Icon" class="w-6 h-6 object-contain" />
		<span class="text-sm font-medium tracking-wide text-white">
			{{ item.symbol }}
		</span>
	</div>
	<div class="text-sm text-right">
		<div :class="{
			'text-green-400': rentability > 0,
			'text-red-400': rentability < 0,
			'text-white': rentability === 0,
		}">
			{{ item.currentPrice.toFixed(2) }} €
		</div>
		<div class="text-xs text-gray-400">
			({{ ((item.currentInvested + item.comission) / item.quantity).toFixed(2) }} €)
		</div>
	</div>
	<div class="text-sm text-right text-white">
		{{ item.quantity }}
	</div>
	<div class="text-sm text-right">
		<div :class="{
			'text-green-400': rentability > 0,
			'text-red-400': rentability < 0,
			'text-white': rentability === 0,
		}">
			{{ (item.currentPrice * item.quantity).toFixed(2) }} €
		</div>
		<div class="text-xs text-gray-400">({{ (item.currentInvested + item.comission).toFixed(2) }} €)</div>
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

const rentability = computed(() => {
	const buyPrice = props.item.currentInvested + props.item.comission;
	return ((props.item.currentPrice * props.item.quantity - buyPrice) / buyPrice) * 100;
});
</script>
