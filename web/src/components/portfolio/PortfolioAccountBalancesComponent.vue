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
        class="mt-4 grid grid-cols-3 gap-x-4 items-center py-2 border-b border-gray-700"
    >
        <div class="text-sm text-right text-white">{{ formatDate(item.updated_at) }}</div>
        <div class="text-sm font-semibold text-right text-white">{{ formatCurrency(item.balance, currency) }}</div>
        <div
            class="text-sm text-right"
            :class="textColorByRentability(item.balance - account.balance_history[index + 1]?.balance)"
        >
            <span v-if="index < account.balance_history.length - 1">
                {{ formatCurrency(item.balance - account.balance_history[index + 1].balance, currency) }}
            </span>
            <span v-else class="text-gray-500">—</span>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { useSettingsStore } from '@/stores/settings';
import type { Account } from '@/types/user';
import { textColorByRentability } from '@/utils/styles';
import { formatCurrency, formatDate } from '@/utils/utils';
import { storeToRefs } from 'pinia';

defineProps({
    account: {
        type: Object as () => Account,
        required: true,
    },
});
defineEmits(['create']);

const { currency } = storeToRefs(useSettingsStore());
</script>
