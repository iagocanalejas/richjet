<template>
    <div v-if="values.length" class="mt-6 w-full">
        <ul class="space-y-4">
            <li
                v-for="(result, index) in visibleItems"
                :key="index"
                class="flex items-center justify-between bg-gray-800 p-4 rounded-lg space-x-4 cursor-pointer"
            >
                <div class="flex items-center space-x-3">
                    <img :src="result.image" alt="Icon" class="w-6 h-6 object-contain" />
                    <span class="text-sm font-medium tracking-wide text-white">
                        {{ result.symbol }}
                    </span>
                </div>
                <button
                    @click="emit('onRemove', result)"
                    class="text-gray-400 hover:text-red-500 transition-colors"
                    title="Remove"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        class="w-5 h-5"
                    >
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M10 12h4M4 6h16M9 6h6a2 2 0 012 2v12a2 2 0 01-2 2H7a2 2 0 01-2-2V8a2 2 0 012-2z"
                        />
                    </svg>
                </button>
            </li>
        </ul>

        <Observer @intersect="currentPage++" />
    </div>

    <div v-else class="mt-6 w-full text-center text-gray-500">
        <p class="text-sm">No results found.</p>
    </div>
</template>

<script setup lang="ts">
import { type TransactionItem } from "@/types/finnhub";
import { computed, ref } from "vue";
import Observer from "./Observer.vue";

const emit = defineEmits(["onRemove"]);

const ITEMS_PER_PATE = 20;

const props = defineProps({
    values: {
        type: Array as () => TransactionItem[],
        default: () => [],
    },
});

const currentPage = ref(0);
const visibleItems = computed(() => {
    return props.values.slice(0, (currentPage.value + 1) * ITEMS_PER_PATE);
});
</script>
