<template>
    <div class="hidden md:grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-4 px-4 py-2 text-sm font-semibold text-white">
        <div>Asset</div>
        <div class="text-right">Date</div>
        <div class="text-right">Price</div>
        <div class="text-right">Quantity</div>
        <div class="text-right">Total</div>
    </div>
    <ul class="hidden md:block space-y-4">
        <li
            v-for="transaction of itemTransactions"
            :key="transaction.id"
            class="relative rounded-lg cursor-pointer transition-colors border-l-4 p-4 md:grid md:grid-cols-[2fr_1fr_1fr_1fr_1fr] md:gap-4 md:items-center bg-gray-800"
            :class="[borderByTransactionType(transaction.transaction_type)]"
        >
            <div class="flex transactions-center space-x-3">
                <img
                    v-show="transaction.symbol.picture"
                    :src="transaction.symbol.picture"
                    class="w-6 h-6 object-contain"
                    alt="Icon"
                />
                <div class="flex transactions-baseline gap-1">
                    <span class="text-sm font-medium tracking-wide text-white">
                        {{ transaction.symbol.display_name }}
                    </span>
                    <span class="text-xs text-gray-400 self-center"> ({{ transaction.symbol.ticker }}) </span>
                </div>
            </div>

            <div class="block text-sm text-right">
                {{ formatDate(transaction.date) }}
            </div>
            <div class="block text-sm text-right">
                {{ transaction.price ? formatCurrency(transaction.price, currency) : '---' }}
            </div>
            <div class="block text-sm text-right">
                {{ transaction.quantity ? transaction.quantity : '---' }}
            </div>
            <div class="block text-sm text-right">
                {{
                    !isDividend(transaction.transaction_type)
                        ? formatCurrency(transactionTotal(transaction), currency)
                        : '---'
                }}
            </div>
        </li>
    </ul>

    <!-- Mobile layout (card style) -->
    <div
        v-for="transaction of itemTransactions"
        :key="transaction.id"
        class="flex flex-col gap-2 md:hidden bg-gray-800 p-4 my-3 border-l-4"
        :class="[borderByTransactionType(transaction.transaction_type)]"
    >
        <div class="flex justify-between text-sm">
            <span class="text-gray-400 text-xs">Date</span>
            <span>{{ formatDate(transaction.date) }}</span>
        </div>

        <div class="flex justify-between text-sm">
            <span class="text-gray-400 text-xs">Price</span>
            <span>{{ transaction.price ? formatCurrency(transaction.price, currency) : '---' }}</span>
        </div>

        <div class="flex justify-between text-sm">
            <span class="text-gray-400 text-xs">Quantity</span>
            <span>{{ transaction.quantity ? transaction.quantity : '---' }}</span>
        </div>

        <div class="flex justify-between text-sm">
            <span class="text-gray-400 text-xs">Total</span>
            <span>
                {{
                    !isDividend(transaction.transaction_type)
                        ? formatCurrency(transactionTotal(transaction), currency)
                        : '---'
                }}
            </span>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { useTransactionsStore } from '@/stores/transactions';
import type { PortfolioItem, TransactionItem } from '@/types/portfolio';
import { storeToRefs } from 'pinia';
import { computed, type PropType } from 'vue';
import { isBuy, isDividend, isSell } from '@/utils/rules';
import { formatCurrency, formatDate } from '@/utils/utils';
import { useSettingsStore } from '@/stores/settings';
import { borderByTransactionType } from '@/utils/styles';

const props = defineProps({ item: { type: Object as PropType<PortfolioItem>, required: true } });

const { transactions } = storeToRefs(useTransactionsStore());
const { currency } = storeToRefs(useSettingsStore());

const itemTransactions = computed(() => transactions.value.filter((t) => t.symbol.id === props.item.symbol.id));
function transactionTotal(transaction: TransactionItem) {
    const { quantity, price, commission } = transaction;
    const base = quantity * price;

    if (isBuy(transaction)) return base + commission;
    if (isSell(transaction)) return base - commission;
    return base;
}
</script>
