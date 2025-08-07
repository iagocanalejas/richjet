<template>
    <LoadingSpinner />
    <div v-if="values.length" class="mt-6 w-full">
        <div class="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-4 px-4 py-2 text-sm font-semibold text-white">
            <div>Asset</div>
            <div class="text-right">Date</div>
            <div class="text-right">Price</div>
            <div class="text-right">Quantity</div>
            <div class="text-right">Total</div>
            <div class="text-right"></div>
        </div>
        <ul class="mt-2 space-y-4">
            <li
                v-for="(item, index) in visibleItems"
                :key="index"
                class="relative grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-4 items-center p-4 rounded-lg cursor-pointer transition-colors border-l-4"
                :class="[borderByTransactionType(item.transaction_type)]"
            >
                <TransactionItemComponent :item="item" @remove="emit('remove', item)" @edit="emit('edit', item)" />
            </li>
        </ul>

        <IntersectionObserver @intersect="currentPage++" />
    </div>

    <div v-else-if="!isLoading" class="mt-6 w-full text-center text-gray-500">
        <p class="text-sm">No results found.</p>
    </div>
</template>

<script setup lang="ts">
import { type TransactionItem } from '@/types/portfolio';
import { computed, ref, type PropType } from 'vue';
import { storeToRefs } from 'pinia';
import { useLoadingStore } from '@/stores/loading';
import LoadingSpinner from '../LoadingSpinner.vue';
import IntersectionObserver from '../utils/IntersectionObserver.vue';
import { borderByTransactionType } from '@/utils/styles';
import TransactionItemComponent from './TransactionItemComponent.vue';

const emit = defineEmits(['edit', 'remove']);
const { isLoading } = storeToRefs(useLoadingStore());

const ITEMS_PER_PATE = 20;

const props = defineProps({
    values: { type: Array as PropType<TransactionItem[]>, default: () => [] },
});

const currentPage = ref(0);
const visibleItems = computed(() => {
    return props.values.slice(0, (currentPage.value + 1) * ITEMS_PER_PATE);
});
</script>
