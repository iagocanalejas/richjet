<template>
    <LoadingSpinner />
    <div v-if="values.length" class="mt-6 w-full">
        <ul class="space-y-4">
            <li
                v-for="(item, index) in visibleItems"
                :key="index"
                @click="openTransactionModal(item)"
                class="relative flex items-center justify-between bg-gray-800 p-4 rounded-lg space-x-4 cursor-pointer"
            >
                <div
                    class="absolute top-0 left-4 -translate-y-1/2 bg-gray-600 text-white text-xs px-2 py-0.5 rounded shadow"
                >
                    {{ item.source !== 'created' ? item.source : 'N/A' }}
                </div>
                <SharesItemComponent
                    :item="item"
                    @favorite="$emit('favorite', item)"
                    @load-price="$emit('load-price', item)"
                    @image-error="item.picture = undefined"
                />
            </li>
        </ul>

        <IntersectionObserver @intersect="currentPage++" />
    </div>

    <div v-else-if="!isLoading" class="mt-6 w-full text-center text-gray-500">
        <p class="text-sm">No results found.</p>
    </div>

    <div v-if="showLoadMore" class="mt-6 w-full text-center">
        <button
            @click="$emit('load-more')"
            class="bg-gray-800 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
        >
            Load more
        </button>
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
import { computed, ref, type PropType } from 'vue';
import { storeToRefs } from 'pinia';
import { useSettingsStore } from '@/stores/settings';
import { useLoadingStore } from '@/stores/loading';
import SharesItemComponent from './SharesItemComponent.vue';
import LoadingSpinner from '@/components/LoadingSpinner.vue';
import TransactionModal from '@/components/modals/TransactionModal.vue';
import IntersectionObserver from '@/components/utils/IntersectionObserver.vue';
import type { TransactionItem } from '@/types/portfolio';
import { accountCanHaveShares } from '@/utils/rules';
import { useErrorsStore } from '@/stores/errors';

const ITEMS_PER_PATE = 20;

const props = defineProps({
    values: { type: Array as PropType<StockSymbolForDisplay[]>, default: () => [] },
    showLoadMore: { type: Boolean, default: false },
});
const emit = defineEmits(['favorite', 'transact', 'load-more', 'load-price']);

const { currency, account: selectedAccount } = storeToRefs(useSettingsStore());
const { isLoading } = storeToRefs(useLoadingStore());
const { addError } = useErrorsStore();

// pagination
const currentPage = ref(0);
const visibleItems = computed(() => props.values.slice(0, (currentPage.value + 1) * ITEMS_PER_PATE));

// modal
const isTransactionModalOpen = ref(false);
const transaction = ref<Omit<TransactionItem, 'id' | 'user_id'> | undefined>();

function openTransactionModal(item: StockSymbolForDisplay) {
    if (!item.isFavorite) return;
    if (!accountCanHaveShares(selectedAccount.value)) {
        addError({ readable_message: 'Invalid account type.' });
        return;
    }

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
    };
}

function buy(item: TransactionItem) {
    emit('transact', item);
    closeModal();
}

function sell(item: TransactionItem) {
    item.transaction_type = 'SELL';
    emit('transact', item);
    closeModal();
}

function closeModal() {
    isTransactionModalOpen.value = false;
    transaction.value = undefined;
}
</script>
