<template>
    <LoadingSpinner />
    <div v-if="values.length" class="mt-6 w-full">
        <ul class="space-y-4">
            <li
                v-for="(item, index) in visibleItems"
                :key="index"
                @click="openTransactionModal(item)"
                class="flex items-center justify-between bg-gray-800 p-4 rounded-lg space-x-4 cursor-pointer"
            >
                <div class="flex items-center space-x-3">
                    <img
                        v-show="!item.hideImage"
                        :src="item.picture"
                        :key="item.hideImage ? 'error' : 'ok'"
                        @error="item.hideImage = true"
                        class="w-6 h-6 object-contain"
                        alt="Share icon"
                    />
                    <div class="flex flex-col">
                        <div class="flex flex-col sm:flex-row sm:items-center sm:space-x-2">
                            <span class="truncate font-medium text-white">{{ item.name }}</span>
                            <span class="text-xs text-gray-400">({{ item.ticker }})</span>
                        </div>
                        <div
                            v-if="item.isin || item.figi"
                            class="flex flex-col sm:flex-row sm:items-center sm:space-x-2"
                        >
                            <div v-if="item.isin" class="text-xs text-gray-300 sm:mt-0.5">ISIN: {{ item.isin }}</div>
                            <div v-if="item.figi" class="text-xs text-gray-300 sm:mt-0.5">FIGI: {{ item.figi }}</div>
                        </div>
                    </div>
                </div>

                <div class="flex items-center space-x-2 relative">
                    <div v-if="item.price" class="flex items-center text-sm me-5">
                        <div class="text-right" :class="textColorByRentability(item.price - item.openPrice!)">
                            <div class="font-semibold">{{ formatCurrency(item.price, currency, conversionRate) }}</div>
                            <div class="text-xs">
                                {{ item.price - item.openPrice! > 0 ? '+' : '' }}
                                {{ (((item.price - item.openPrice!) / item.openPrice!) * 100).toFixed(2) }}%
                            </div>
                        </div>
                    </div>

                    <button
                        @click.stop="emit('favorite', item)"
                        class="text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
                        :title="item.isFavorite ? 'Unfavorite' : 'Favorite'"
                    >
                        <svg
                            v-if="item.isFavorite"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                            class="w-5 h-5"
                        >
                            <path
                                d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2
						5.42 4.42 3 7.5 3c1.74 0 3.41 0.81 4.5
						2.09C13.09 3.81 14.76 3 16.5 3 19.58 3
						22 5.42 22 8.5c0 3.78-3.4 6.86-8.55
						11.54L12 21.35z"
                            />
                        </svg>
                        <svg
                            v-else
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
                                d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2
							5.42 4.42 3 7.5 3c1.74 0 3.41 0.81 4.5
							2.09C13.09 3.81 14.76 3 16.5 3 19.58 3
							22 5.42 22 8.5c0 3.78-3.4 6.86-8.55
							11.54L12 21.35z"
                            />
                        </svg>
                    </button>
                    <button class="text-gray-400 hover:text-white cursor-pointer" title="Options">⋮</button>
                </div>
            </li>
        </ul>

        <IntersectionObserver @intersect="currentPage++" />
    </div>

    <div v-else-if="!isLoading" class="mt-6 w-full text-center text-gray-500">
        <p class="text-sm">No results found.</p>
    </div>

    <div
        v-if="isTransactionModalOpen && transaction"
        class="fixed inset-0 bg-gray-800 bg-opacity-75 flex justify-center items-center z-50"
    >
        <TransactionModal
            v-if="isTransactionModalOpen && transaction"
            :transaction="transaction"
            @buy="buy"
            @sell="sell"
            @close="closeModal"
        />
    </div>
</template>

<script setup lang="ts">
import { type StockSymbolForDisplay } from '@/types/stock';
import { computed, ref } from 'vue';
import { storeToRefs } from 'pinia';
import { useSettingsStore } from '@/stores/settings';
import { formatCurrency } from '@/utils/utils';
import { textColorByRentability } from '@/utils/styles';
import LoadingSpinner from './LoadingSpinner.vue';
import TransactionModal from './modals/TransactionModal.vue';
import { useLoadingStore } from '@/stores/loading';
import IntersectionObserver from './utils/IntersectionObserver.vue';
import type { TransactionItem } from '@/types/portfolio';

const ITEMS_PER_PATE = 20;

const props = defineProps({
    values: {
        type: Array as () => StockSymbolForDisplay[],
        default: () => [],
    },
});
const emit = defineEmits(['favorite', 'transact']);

const { currency, conversionRate, account: selectedAccount } = storeToRefs(useSettingsStore());
const { isLoading } = storeToRefs(useLoadingStore());

// pagination
const currentPage = ref(0);
const visibleItems = computed(() => props.values.slice(0, (currentPage.value + 1) * ITEMS_PER_PATE));

// modal
const isTransactionModalOpen = ref(false);
const transaction = ref<Omit<TransactionItem, 'id' | 'user_id'> | undefined>();

function openTransactionModal(item: StockSymbolForDisplay) {
    isTransactionModalOpen.value = true;
    transaction.value = {
        symbol: item,
        symbol_id: item.id,
        quantity: 0,
        price: 0,
        commission: 0,
        currency: currency.value,
        transaction_type: 'BUY',
        date: new Date().toISOString().split('T')[0],
        account: selectedAccount.value,
        account_id: selectedAccount.value?.id ?? undefined,
    };
}

function buy(item: TransactionItem) {
    if (item.quantity <= 0 || item.price <= 0) {
        alert('Please enter a valid quantity and price.');
        return;
    }
    emit('transact', item);
    closeModal();
}

function sell(item: TransactionItem) {
    if (item.quantity <= 0 || item.price <= 0) {
        alert('Please enter a valid quantity and price.');
        return;
    }
    item.transaction_type = 'SELL';
    emit('transact', item);
    closeModal();
}

function closeModal() {
    isTransactionModalOpen.value = false;
}
</script>
