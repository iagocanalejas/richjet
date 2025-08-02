<template>
    <div v-if="portfolio.length" class="w-full">
        <div class="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_0.2fr] gap-4 px-4 py-2 text-sm font-semibold text-white">
            <div>Asset</div>
            <div class="text-right">Avg Price</div>
            <div class="text-right">Quantity</div>
            <div class="text-right">Value</div>
            <div class="text-right">Rentability</div>
            <div class="text-right"></div>
        </div>
        <ul class="space-y-4">
            <li
                v-for="item in portfolio"
                :key="item.symbol.ticker"
                @click="showContextMenu($event, item)"
                class="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_0.2fr] gap-4 items-center bg-gray-800 p-4 rounded-lg"
            >
                <PortfolioItemComponent v-if="!isTradePortfolioItem(item)" :item="item" />
                <PortfolioTradeItemComponent v-else :item="item" />
            </li>
        </ul>
    </div>

    <div v-else-if="!isLoading" class="mt-6 w-full text-center text-gray-500">
        <p class="text-sm">No results found.</p>
    </div>

    <ContextMenu
        :visible="contextMenu.visible"
        :x="contextMenu.x"
        :y="contextMenu.y"
        @close="contextMenu.visible = false"
    >
        <button
            class="block w-full text-left rounded-lg transition duration-200 hover:bg-gray-700 hover:text-gray-300 px-2 py-1"
            @click="openTransactionsModal(contextMenu.item!, 'buy')"
        >
            Buy Shares
        </button>
        <button
            v-if="contextMenu.item!.quantity"
            class="block w-full text-left rounded-lg transition duration-200 hover:bg-gray-700 hover:text-gray-300 px-2 py-1"
            @click="openTransactionsModal(contextMenu.item!, 'sell')"
        >
            Sell Shares
        </button>
        <button
            v-if="contextMenu.item!.quantity"
            class="block w-full text-left rounded-lg transition duration-200 hover:bg-gray-700 hover:text-gray-300 px-2 py-1"
            @click="openDividendsModal(contextMenu.item!)"
        >
            Add Dividend
        </button>
        <button
            v-if="contextMenu.item!.quantity"
            class="block w-full text-left rounded-lg transition duration-200 hover:bg-gray-700 hover:text-gray-300 px-2 py-1"
            @click="openTransferStockModal(contextMenu.item!)"
        >
            Transfer Account
        </button>
        <button
            v-if="contextMenu.item!.quantity && isPortfolioItemWithManualPrice(contextMenu.item!)"
            class="block w-full text-left rounded-lg transition duration-200 hover:bg-gray-700 hover:text-gray-300 px-2 py-1"
            @click="openManualPriceModal(contextMenu.item!)"
        >
            Set Current Price
        </button>
    </ContextMenu>

    <div
        v-if="isTransactionModalOpen && transaction"
        class="fixed inset-0 bg-gray-800 bg-opacity-75 flex justify-center items-center z-50"
    >
        <TransactionModal
            v-if="isTransactionModalOpen && transaction"
            :transaction="transaction"
            :mode="transactionModalMode"
            @buy="buy"
            @sell="sell"
            @close="isTransactionModalOpen = false"
        />
    </div>
    <div
        v-if="isDividendModalOpen && transaction"
        class="fixed inset-0 bg-gray-800 bg-opacity-75 flex justify-center items-center z-50"
    >
        <DividendModal :transaction="transaction" @add-dividend="addDividend" @close="isDividendModalOpen = false" />
    </div>
    <div
        v-if="isTransferStockModalOpen"
        class="fixed inset-0 bg-gray-800 bg-opacity-75 flex justify-center items-center z-50"
    >
        <TransferStockModal
            :item="selectedItem!"
            :selected-account="selectedAccount"
            @transfer="transfer"
            @close="isTransferStockModalOpen = false"
        />
    </div>
    <div v-if="isPriceModalOpen" class="fixed inset-0 bg-gray-800 bg-opacity-75 flex justify-center items-center z-50">
        <ManualPriceModal :item="selectedItem!" @set-price="setPrice" @close="isPriceModalOpen = false" />
    </div>
</template>

<script lang="ts" setup>
import { useLoadingStore } from '@/stores/loading';
import PortfolioItemComponent from './PortfolioItemComponent.vue';
import PortfolioTradeItemComponent from './PortfolioTradeItemComponent.vue';
import { usePortfolioStore } from '@/stores/portfolio';
import { storeToRefs } from 'pinia';
import { ref } from 'vue';
import type { PortfolioItem, TransactionItem } from '@/types/portfolio';
import DividendModal from '../modals/DividendModal.vue';
import { useSettingsStore } from '@/stores/settings';
import { isPortfolioItemWithManualPrice, isTradePortfolioItem } from '@/utils/rules';
import ContextMenu from '../utils/ContextMenu.vue';
import ManualPriceModal from '../modals/ManualPriceModal.vue';
import TransactionModal from '../modals/TransactionModal.vue';
import TransferStockModal from '../modals/TransferStockModal.vue';
import type { Account } from '@/types/user';
import { useTransactionsStore } from '@/stores/transactions';

const transactionStore = useTransactionsStore();
const { portfolio } = storeToRefs(usePortfolioStore());
const { currency, account: selectedAccount } = storeToRefs(useSettingsStore());
const { isLoading } = storeToRefs(useLoadingStore());

// modal
const isDividendModalOpen = ref(false);
const isPriceModalOpen = ref(false);
const isTransactionModalOpen = ref(false);
const isTransferStockModalOpen = ref(false);
const transactionModalMode = ref<'buy' | 'sell'>('buy');
const transaction = ref<Omit<TransactionItem, 'id' | 'user_id'> | undefined>();
const selectedItem = ref<PortfolioItem | undefined>();

// context menu
const contextMenu = ref<{ visible: boolean; x: number; y: number; item: PortfolioItem | undefined }>({
    visible: false,
    x: 0,
    y: 0,
    item: undefined,
});

function showContextMenu(event: MouseEvent, item: PortfolioItem) {
    event.preventDefault();
    event.stopPropagation();

    contextMenu.value = {
        visible: true,
        x: event.clientX + window.scrollX,
        y: event.clientY + window.scrollY,
        item,
    };
}

function openDividendsModal(item: PortfolioItem) {
    transaction.value = {
        account: selectedAccount.value,
        symbol: item.symbol,
        symbol_id: item.symbol.id,
        price: 0,
        quantity: 0,
        commission: 0,
        date: new Date().toISOString().split('T')[0],
        transaction_type: 'DIVIDEND-CASH',
        currency: currency.value,
    };
    isDividendModalOpen.value = true;
}

function openTransactionsModal(item: PortfolioItem, mode: 'buy' | 'sell') {
    isTransactionModalOpen.value = true;
    transactionModalMode.value = mode;
    transaction.value = {
        account: selectedAccount.value,
        symbol: item.symbol,
        symbol_id: item.symbol.id,
        price: 0,
        quantity: 0,
        commission: 0,
        date: new Date().toISOString().split('T')[0],
        transaction_type: 'BUY',
        currency: currency.value,
    };
}

function openTransferStockModal(item: PortfolioItem) {
    selectedItem.value = item;
    isTransferStockModalOpen.value = true;
}

function openManualPriceModal(item: PortfolioItem) {
    selectedItem.value = item;
    isPriceModalOpen.value = true;
}

async function addDividend(t: TransactionItem) {
    await transactionStore.addTransaction(t);
    transaction.value = undefined;
    isDividendModalOpen.value = false;
}

async function buy(t: TransactionItem) {
    await transactionStore.addTransaction(t);
    transaction.value = undefined;
    isTransactionModalOpen.value = false;
}

async function sell(t: TransactionItem) {
    t.transaction_type = 'SELL';
    await transactionStore.addTransaction(t);
    transaction.value = undefined;
    isTransactionModalOpen.value = false;
}

async function transfer(newAccount?: Account) {
    await transactionStore.transferStock(selectedItem.value!.symbol.ticker, selectedAccount.value?.id, newAccount?.id);
    selectedItem.value = undefined;
    isTransferStockModalOpen.value = false;
}

async function setPrice(item: { symbol_id: string; price: number }) {
    await transactionStore.updateManualPrice(item.symbol_id, item.price);
    selectedItem.value = undefined;
    isPriceModalOpen.value = false;
}
</script>
