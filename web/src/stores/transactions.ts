import { defineStore, storeToRefs } from 'pinia';
import { useErrorsStore } from './errors';
import { computed, ref, toRaw } from 'vue';
import type { TransactionItem } from '@/types/portfolio';
import TransactionsService from './api/transactions';
import { useStocksStore } from './stocks';
import { hasBoughtSharesIfNeeded } from '@/utils/rules';
import { useSettingsStore } from './settings';
import { useWatchlistStore } from './watchlist';

export const useTransactionsStore = defineStore('transactions', () => {
    const settingsStore = useSettingsStore();
    const { addError } = useErrorsStore();
    const { getStockQuote } = useStocksStore();
    const { account, accounts } = storeToRefs(settingsStore);
    const { updateSymbolManualPrice } = useWatchlistStore();

    const transactions = ref<Readonly<TransactionItem>[]>([]);

    const _accountKey = computed(() => account.value?.name ?? 'all');
    const cashDividends = computed(() =>
        transactions.value
            .filter((t) => t.transaction_type === 'DIVIDEND-CASH')
            .filter((t) => _accountKey.value === 'all' || t.account?.name === _accountKey.value)
            .reduce((acc, t) => acc + t.price, 0)
    );

    async function init() {
        const trs = await TransactionsService.loadTransactions();
        transactions.value = structuredClone(trs);

        const symbols = [...new Set(trs.map((t) => t.symbol))];
        for (let i = 0; i < symbols.length; i += 5) {
            const batch = symbols.slice(i, i + 5);
            await Promise.all(batch.map((symbol) => getStockQuote(symbol)));
        }

        for (const cur of new Set(trs.map((t) => t.currency))) {
            await settingsStore.loadConvertionRate(cur);
        }
    }

    async function addTransaction(t: TransactionItem) {
        if (!hasBoughtSharesIfNeeded(t, transactions.value)) {
            addError({ readable_message: 'Trying to create a dividend for a stock that does not exist' });
            return;
        }

        const transaction = await TransactionsService.addTransaction({ ...t, account_id: account.value?.id });
        if (!transaction) return;

        const trDate = new Date(transaction.date);
        const index = transactions.value.findIndex((i) => new Date(i.date) < trDate);
        if (index !== -1) {
            transactions.value.splice(index, 0, transaction);
        } else {
            transactions.value.push(transaction);
        }
    }

    async function updateTransaction(t: TransactionItem) {
        const transaction = await TransactionsService.updateTransaction({ ...t, account_id: account.value?.id });
        if (!transaction) return;

        const index = transactions.value.findIndex((t) => t.id === transaction.id);
        if (index === -1) {
            addError({ readable_message: 'Transaction not found for update' });
            return;
        }
        transactions.value.splice(index, 1, transaction);
    }

    async function removeTransaction(transaction: TransactionItem) {
        const lastIndex = transactions.value.lastIndexOf(transaction);
        if (lastIndex < 0) return;

        const isRemoved = await TransactionsService.removeTransaction(transaction.id);
        if (!isRemoved) return;

        transactions.value = transactions.value.filter((t) => t.id !== transaction.id);
    }

    async function transferStock(symbol: string, fromAccountId?: string, toAccountId?: string) {
        if (fromAccountId === toAccountId) return;

        const toAccount = toAccountId ? accounts.value.find((a) => a.id === toAccountId) : undefined;
        const fromAccount = fromAccountId ? accounts.value.find((a) => a.id === fromAccountId) : undefined;
        const transferedIds = await TransactionsService.transferStock(symbol, fromAccount?.id, toAccount?.id);

        for (const [index, transaction] of transactions.value.entries()) {
            if (transferedIds.includes(transaction.id)) {
                const newTransaction = {
                    ...structuredClone(toRaw(transaction)),
                    account: structuredClone(toRaw(toAccount)),
                };
                transactions.value[index] = newTransaction;
            }
        }
    }

    async function updateManualPrice(symbolId: string, price: number) {
        const symbol = updateSymbolManualPrice(symbolId, price);
        if (!symbol) return;

        transactions.value = transactions.value.map((transaction) =>
            transaction.symbol.id === symbolId
                ? { ...structuredClone(toRaw(transaction)), symbol: { ...transaction.symbol, manual_price: price } }
                : transaction
        );
    }

    async function bulkUpdateManualPrices(symbols: { symbol_id: string; price: number }[]) {
        const updates = symbols.map((s) => updateSymbolManualPrice(s.symbol_id, s.price));
        await Promise.all(updates);

        transactions.value = transactions.value.map((transaction) => {
            const symbolUpdate = symbols.find((s) => s.symbol_id === transaction.symbol.id);
            if (symbolUpdate) {
                return {
                    ...structuredClone(toRaw(transaction)),
                    symbol: { ...transaction.symbol, manual_price: symbolUpdate.price },
                };
            }
            return transaction;
        });
    }

    return {
        init,
        transactions,
        cashDividends,
        addTransaction,
        updateTransaction,
        removeTransaction,
        transferStock,
        updateManualPrice,
        bulkUpdateManualPrices,
    };
});
