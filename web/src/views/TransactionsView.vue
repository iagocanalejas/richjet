<template>
    <main class="justify-center min-h-[calc(100vh-144px)] bg-gray-900 text-white p-6">
        <div class="flex flex-col justify-center items-center w-full max-w-2xl mx-auto">
            <SearchComponent @on-search="query = $event" />
        </div>
        <div class="flex flex-col justify-center items-center w-full max-w-2xl mx-auto">
            <TransactionsListComponent
                :values="filteredTransactions"
                @remove="showConfirmationModal"
                @edit="openTransactionModal"
            />
        </div>
    </main>
    <ConfirmationModal ref="confirmationModal" @confirm="removeTransaction" />
    <TransactionModal
        v-if="isOpenTransactionModal && transaction"
        :transaction="transaction"
        :mode="'edit'"
        @save="saveTransaction"
        @close="isOpenTransactionModal = false"
    />
</template>

<script setup lang="ts">
import ConfirmationModal from '@/components/modals/ConfirmationModal.vue';
import TransactionModal from '@/components/modals/TransactionModal.vue';
import SearchComponent from '@/components/SearchComponent.vue';
import TransactionsListComponent from '@/components/transactions/TransactionsListComponent.vue';
import { useTransactionsStore } from '@/stores/transactions';
import type { TransactionItem } from '@/types/portfolio';
import { storeToRefs } from 'pinia';
import { computed, ref } from 'vue';

const transactionsStore = useTransactionsStore();
const { updateTransaction, removeTransaction } = transactionsStore;
const { transactions } = storeToRefs(transactionsStore);

const query = ref('');
const filteredTransactions = computed(() =>
    transactions.value.filter((tx) => tx.symbol.ticker.toLowerCase().includes(query.value.toLowerCase()))
);

const confirmationModal = ref<InstanceType<typeof ConfirmationModal> | null>(null);
function showConfirmationModal(transaction: TransactionItem) {
    confirmationModal.value?.show('Delete Transaction', 'This action cannot be undone.', [transaction]);
}

const transaction = ref<TransactionItem | undefined>(undefined);
const isOpenTransactionModal = ref(false);
function openTransactionModal(item: TransactionItem) {
    transaction.value = item;
    isOpenTransactionModal.value = true;
}

function saveTransaction(transaction: TransactionItem) {
    updateTransaction(transaction);
    isOpenTransactionModal.value = false;
}
</script>
