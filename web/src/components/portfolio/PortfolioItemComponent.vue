<template>
	<div class="flex items-center space-x-3">
		<img v-show="!hideImage" :src="item.image" alt="Icon" class="w-6 h-6 object-contain"
			@error="hideImage = true" />
		<span class="text-sm font-medium tracking-wide text-white">
			{{ item.symbol }}
		</span>
	</div>
	<div class="text-sm text-right">
		<div :class="colorClass(rentability, item.manualInputedPrice)">
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
		<div :class="colorClass(rentability, item.manualInputedPrice)">
			{{ formatCurrency(item.currentPrice * item.quantity, currency) }}
		</div>
		<div class="text-xs text-gray-400">
			({{ formatCurrency(item.currentInvested + item.comission, currency) }})
		</div>
	</div>
	<div class="text-sm text-right" :class="colorClass(rentability, item.manualInputedPrice)">
		{{ rentability.toFixed(2) }} %
	</div>
	<button class="text-gray-400 hover:text-white cursor-pointer" title="Options"> ⋮ </button>
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

const rentability = computed(() => {
	const buyPrice = props.item.currentInvested + props.item.comission;
	return ((props.item.currentPrice * props.item.quantity - buyPrice) / buyPrice) * 100;
});
</script>
