<template>
    <div class="flex justify-end">
        <button
            @click="$emit('create')"
            class="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded transition"
        >
            Add Balance
        </button>
    </div>
    <div
        v-for="(item, index) in account.balance_history"
        :key="item.updated_at"
        class="mt-4 grid grid-cols-4 gap-x-4 items-center py-2 border-b border-gray-700"
    >
        <div class="text-sm text-right text-white">{{ formatDate(item.updated_at) }}</div>
        <div class="text-sm font-semibold text-right text-white">
            {{ formatCurrency(item.balance, currency, conversionRate) }}
        </div>
        <div class="text-sm text-right" :class="textColorByRentability(item.balance - historyBalancePoint(index + 1))">
            <span v-if="index < account.balance_history.length - 1">
                {{ formatCurrency(item.balance - historyBalancePoint(index + 1), currency, conversionRate) }}
            </span>
            <span v-else class="text-gray-500">—</span>
        </div>
        <div v-if="index + 1 < account.balance_history.length" class="text-right">
            <button
                @click="$emit('delete-balance', item.account_id, item.id)"
                class="hover:text-red-500 transition-colors"
                title="Delete"
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
        </div>
    </div>
</template>

<script lang="ts" setup>
import { useSettingsStore } from '@/stores/settings';
import type { Account } from '@/types/user';
import { textColorByRentability } from '@/utils/styles';
import { formatCurrency, formatDate } from '@/utils/utils';
import { storeToRefs } from 'pinia';
import { computed, type PropType } from 'vue';

const props = defineProps({
    account: { type: Object as PropType<Account>, required: true },
});
defineEmits(['create', 'delete-balance']);

const settingsStore = useSettingsStore();
const { currency } = storeToRefs(settingsStore);

const conversionRate = computed(() => settingsStore.getConvertionRate(props.account.currency));

function historyBalancePoint(index: number) {
    return props.account.balance_history[index]?.balance || 0;
}
</script>
