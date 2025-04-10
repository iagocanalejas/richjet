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
			{{ formatCurrency(item.currentPrice, currency) }}
		</div>
		<div class="text-xs text-gray-400">
			({{ formatCurrency((item.currentInvested + item.comission) / item.quantity, currency) }})
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
			{{ formatCurrency(item.currentPrice * item.quantity, currency) }}
		</div>
		<div class="text-xs text-gray-400">({{ formatCurrency(item.currentInvested + item.comission, currency) }})</div>
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
import { useSettingsStore } from "@/stores/settings";
import type { PortfolioItem } from "@/types/finnhub";
import { formatCurrency } from "@/types/utils";
import { storeToRefs } from "pinia";
import { computed } from "vue";

const props = defineProps({
	item: { type: Object as () => PortfolioItem, required: true },
});

const { currency } = storeToRefs(useSettingsStore());

const rentability = computed(() => {
	const buyPrice = props.item.currentInvested + props.item.comission;
	return ((props.item.currentPrice * props.item.quantity - buyPrice) / buyPrice) * 100;
});
</script>
