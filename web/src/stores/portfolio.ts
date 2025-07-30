import { defineStore, storeToRefs } from 'pinia';
import { type PortfolioItem, type TransactionItem } from '@/types/portfolio';
import { computed, ref, type Ref } from 'vue';
import { useStocksStore } from './stocks';
import { useSettingsStore } from './settings';
import { useWatchlistStore } from './watchlist';
import { useErrorsStore } from './errors';
import { hasBoughtSharesIfNeeded, isSavingsAccount } from '@/utils/rules';
import TransactionsService from './api/transactions';

export const usePortfolioStore = defineStore('portfolio', () => {
    const { addError } = useErrorsStore();

    const portfolios: Ref<{ [key: string]: PortfolioItem[] }> = ref({ default: [], all: [] });
    const transactions = ref<TransactionItem[]>([]);
    const cashDividends = ref(0);

    const stockStore = useStocksStore();
    const { conversionRate, account, accounts } = storeToRefs(useSettingsStore());
    const watchlistStore = useWatchlistStore();
    const { updateSymbolManualPrice } = watchlistStore;

    const _accountKey = computed(() => account.value?.name ?? 'all');
    const portfolio = computed(() => portfolios.value[_accountKey.value] ?? []);

    async function init() {
        const transactionsForPortfolio = await TransactionsService.loadTransactions();
        transactions.value = structuredClone(transactionsForPortfolio);
        portfolios.value['default'] = [];
        portfolios.value['all'] = [];

        // prefetch stock quotes for all transactions and saves them in the cache
        await _prefetchStockQuotes();

        // update portfolios with transactions
        for (const transaction of transactionsForPortfolio.reverse()) {
            const key = transaction.account?.name ?? 'default';
            if (!portfolios.value[key] && key !== 'default') portfolios.value[key] = [];
            await _updatePortfolio(key, transaction);
        }

        // sort each portfolio by ticker
        for (const key in portfolios.value) {
            portfolios.value[key].sort((a, b) => a.symbol.ticker.localeCompare(b.symbol.ticker));
        }
    }

    async function addTransaction(transaction: TransactionItem) {
        if (!hasBoughtSharesIfNeeded(transaction, transactions.value)) {
            addError({ readable_message: 'Trying to create a dividend for a stock that does not exist' });
            return;
        }

        const newTransaction = await TransactionsService.addTransaction(transaction);
        if (!newTransaction) return;

        transactions.value.unshift(newTransaction);
        _updatePortfolio(newTransaction.account?.name ?? 'default', newTransaction);
    }

    async function removeTransaction(transaction: TransactionItem) {
        const lastIndex = transactions.value.lastIndexOf(transaction);
        if (lastIndex < 0) return;

        const isRemoved = await TransactionsService.removeTransaction(transaction.id);
        if (!isRemoved) return;

        transactions.value.splice(lastIndex, 1);
        _removeTransactionFromPortfolio(transaction.account?.name ?? 'default', transaction);
    }

    async function transferStock(symbol: string, fromAccountId?: string, toAccountId?: string) {
        if (fromAccountId === toAccountId) return;

        const toAccount = toAccountId ? accounts.value.find((a) => a.id === toAccountId) : undefined;
        const fromAccount = fromAccountId ? accounts.value.find((a) => a.id === fromAccountId) : undefined;
        const transferedIds = await TransactionsService.transferStock(symbol, fromAccount?.id, toAccount?.id);
        for (const transaction of transactions.value) {
            if (transferedIds.includes(transaction.id)) {
                transaction.account = toAccount;
            }
        }

        const fromPortfolio = portfolios.value[fromAccount?.name ?? 'default'];
        let toPortfolio = portfolios.value[toAccount?.name ?? 'default'];
        if (!toPortfolio && toAccount) {
            portfolios.value[toAccount.name] = [];
            toPortfolio = portfolios.value[toAccount.name];
        }

        if (!toPortfolio) throw new Error(`Portfolio for account '${toAccount?.name}' not found`);
        if (!fromPortfolio) throw new Error(`Portfolio for account '${fromAccount?.name}' not found`);

        // remove from the old portfolio
        const fromIdx = fromPortfolio.findIndex((item) => item.symbol.ticker === symbol);
        const item = fromPortfolio[fromIdx];
        fromPortfolio.splice(fromIdx, 1);
        portfolios.value[fromAccount?.name ?? 'default'] = [...fromPortfolio];

        // add to the new portfolio
        const toIdx = toPortfolio.findIndex((item) => item.symbol.ticker === symbol);
        if (toIdx >= 0) {
            toPortfolio[toIdx].quantity += item.quantity;
            toPortfolio[toIdx].currentInvested += item.currentInvested;
            toPortfolio[toIdx].totalInvested += item.totalInvested;
            toPortfolio[toIdx].commission += item.commission;
            toPortfolio[toIdx].sortedBuys.push(...item.sortedBuys);
            toPortfolio[toIdx].sortedBuys.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            toPortfolio[toIdx].sortedSells.push(...item.sortedSells);
            toPortfolio[toIdx].sortedSells.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        } else {
            toPortfolio.push({ ...item });
        }
        toPortfolio.sort((a, b) => a.symbol.ticker.localeCompare(b.symbol.ticker));
        portfolios.value[toAccount?.name ?? 'default'] = [...toPortfolio];
    }

    async function updateManualPrice(symbol_id: string, price?: number) {
        const updatedSymbol = await updateSymbolManualPrice(symbol_id, price);
        const portfolio = portfolios.value[_accountKey.value];
        for (const item of portfolio) {
            if (item.symbol.id === symbol_id) {
                item.currentPrice = updatedSymbol?.manual_price ?? 0;
                break;
            }
        }
    }

    async function _prefetchStockQuotes() {
        const symbols = [...new Set(transactions.value.map((t) => t.symbol))];
        for (let i = 0; i < symbols.length; i += 5) {
            const batch = symbols.slice(i, i + 5);
            await Promise.all(batch.map((symbol) => stockStore.getStockQuote(symbol)));
        }
    }

    async function _updatePortfolio(portfolioKey: string, transaction: Readonly<TransactionItem>) {
        if (transaction.transaction_type === 'DIVIDEND-CASH') {
            cashDividends.value += transaction.price;
            return;
        }

        let portfolio = portfolios.value[portfolioKey];
        if (!portfolio) {
            portfolios.value[portfolioKey] = [];
            portfolio = portfolios.value[portfolioKey];
        }

        const idx = portfolio.findIndex((item) => item.symbol.ticker === transaction.symbol.ticker);
        if (idx >= 0) {
            if (transaction.transaction_type === 'BUY') {
                portfolio[idx].quantity += transaction.quantity;
                portfolio[idx].currentInvested += transaction.price * transaction.quantity;
                portfolio[idx].totalInvested += transaction.price * transaction.quantity;
                portfolio[idx].commission += transaction.commission;
                portfolio[idx].sortedBuys.push(structuredClone(transaction));
            } else if (transaction.transaction_type === 'SELL') {
                let remainingToSell = transaction.quantity;
                let costBasis = 0;

                // Apply FIFO: consume from earliest buys first
                while (remainingToSell > 0 && portfolio[idx].sortedBuys.length > 0) {
                    const buy = portfolio[idx].sortedBuys[0];
                    if (buy.quantity <= remainingToSell) {
                        // Fully consume this buy
                        costBasis += buy.quantity * buy.price;
                        remainingToSell -= buy.quantity;
                        portfolio[idx].sortedBuys.shift();
                    } else {
                        // Partially consume this buy
                        costBasis += remainingToSell * buy.price;
                        buy.quantity -= remainingToSell;
                        remainingToSell = 0;
                    }
                }

                portfolio[idx].quantity -= transaction.quantity;
                portfolio[idx].currentInvested -= costBasis;
                portfolio[idx].totalRetrieved += transaction.price * transaction.quantity;
                portfolio[idx].commission += transaction.commission;
                portfolio[idx].sortedSells.push(structuredClone({ ...transaction, costBasis }));
            } else if (transaction.transaction_type === 'DIVIDEND') {
                portfolio[idx].quantity += transaction.quantity;
            }
        } else {
            if (!transaction.symbol || !transaction.symbol.source) {
                throw new Error('A dividend was created before the stock was created, please create the stock first');
            }

            let currentPrice = transaction.symbol.manual_price;
            if (!currentPrice) {
                const quote = await stockStore.getStockQuote(transaction.symbol);
                currentPrice = (quote?.current || 0) * conversionRate.value;
            }

            portfolio.push({
                symbol: transaction.symbol,
                currency: transaction.currency,
                quantity: transaction.quantity,
                currentPrice: currentPrice,
                currentInvested: transaction.price * transaction.quantity,
                totalInvested: transaction.price * transaction.quantity,
                totalRetrieved: 0,
                commission: transaction.commission,
                sortedBuys: [structuredClone(transaction)],
                sortedSells: [],
            });
        }

        // trigger Vue reactivity by creating a new reference
        portfolios.value[portfolioKey] = [...portfolio];
        if (portfolioKey !== 'all') await _updatePortfolio('all', transaction);
    }

    function _removeTransactionFromPortfolio(portfolioKey: string, transaction: TransactionItem) {
        if (transaction.transaction_type === 'DIVIDEND-CASH') {
            cashDividends.value -= transaction.price;
            return;
        }

        const portfolio = portfolios.value[portfolioKey];
        if (!portfolio) throw new Error('portfolio not found');

        const idx = portfolio.findIndex((item) => item.symbol.ticker === transaction.symbol.ticker);
        if (transaction.transaction_type === 'BUY') {
            portfolio[idx].quantity -= transaction.quantity;
            if (portfolio[idx].quantity <= 0) {
                portfolio.splice(idx, 1);
                portfolios.value[portfolioKey] = [...portfolio];
                if (portfolioKey !== 'all') _removeTransactionFromPortfolio('all', transaction);
                return;
            }
            portfolio[idx].currentInvested -= transaction.price * transaction.quantity;
            portfolio[idx].totalInvested -= transaction.price * transaction.quantity;
            portfolio[idx].commission -= transaction.commission;
            portfolio[idx].sortedBuys = portfolio[idx].sortedBuys.filter((t) => t !== transaction);
        } else if (transaction.transaction_type === 'SELL') {
            portfolio[idx].quantity += transaction.quantity;
            portfolio[idx].currentInvested += transaction.price * transaction.quantity;
            portfolio[idx].totalRetrieved -= transaction.price * transaction.quantity;
            portfolio[idx].commission -= transaction.commission;
            portfolio[idx].sortedSells = portfolio[idx].sortedSells.filter((t) => t !== transaction);
        } else if (transaction.transaction_type === 'DIVIDEND') {
            portfolio[idx].quantity -= transaction.quantity;
        }

        // trigger Vue reactivity by creating a new reference
        portfolios.value[portfolioKey] = [...portfolio];
        if (portfolioKey !== 'all') _removeTransactionFromPortfolio('all', transaction);
    }

    const totalInvested = computed(() => {
        const portfolio = portfolios.value[_accountKey.value];
        if (!portfolio) return 0;
        return portfolio
            .filter((p) => p.quantity > 0)
            .reduce((acc, item) => acc + item.currentInvested + item.commission, 0);
    });

    const portfolioCurrentValue = computed(() => {
        const portfolio = portfolios.value[_accountKey.value];
        if (!portfolio) return 0;
        const portfoliosValue = portfolio
            .filter((p) => p.quantity > 0)
            .reduce((acc, item) => acc + item.currentPrice * item.quantity, 0);
        return portfoliosValue + savingAccountsValue.value;
    });

    const savingAccountsValue = computed(() => {
        const money = accounts.value.filter((a) => isSavingsAccount(a)).reduce((acc, a) => acc + a.balance!, 0) ?? 0;
        return money * conversionRate.value;
    });

    const closedPositions = computed(() => {
        const portfolio = portfolios.value[_accountKey.value];
        if (!portfolio) return 0;
        return portfolio.reduce((total, item) => {
            const { quantity, totalRetrieved, totalInvested, currentInvested, commission } = item;
            const currentlyInvested =
                quantity === 0 ? totalInvested + commission : totalInvested - currentInvested + commission;
            return total + (totalRetrieved - currentlyInvested);
        }, 0);
    });

    const rentability = computed(() => {
        return totalInvested.value
            ? ((portfolioCurrentValue.value + closedPositions.value + cashDividends.value - totalInvested.value) /
                  totalInvested.value) *
                  100
            : 0;
    });

    return {
        init,
        portfolio,
        portfolios,
        transactions,
        cashDividends,
        addTransaction,
        removeTransaction,
        transferStock,
        updateManualPrice,
        totalInvested,
        portfolioCurrentValue,
        savingAccountsValue,
        closedPositions,
        rentability,
    };
});
