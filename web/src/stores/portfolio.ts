import { defineStore, storeToRefs } from 'pinia';
import { type PortfolioItem, type TransactionItem } from '@/types/portfolio';
import { computed, ref, type Ref } from 'vue';
import { useStocksStore } from './stocks';
import { useSettingsStore } from './settings';
import { useWatchlistStore } from './watchlist';

export const usePortfolioStore = defineStore('portfolio', () => {
    const portfolios: Ref<{ [key: string]: PortfolioItem[] }> = ref({ default: [], all: [] });
    const transactions = ref<TransactionItem[]>([]);
    const cashDividends = ref(0);

    const stockStore = useStocksStore();
    const { conversionRate, account, accounts } = storeToRefs(useSettingsStore());
    const watchlistStore = useWatchlistStore();
    const { updateSymbolManualPrice } = watchlistStore;
    const { manualPrices } = storeToRefs(watchlistStore);

    const _accountKey = computed(() => account.value?.name ?? 'all');
    const portfolio = computed(() => portfolios.value[_accountKey.value] ?? []);

    async function init() {
        const res = await fetch('/api/transactions', { method: 'GET', credentials: 'include' });
        if (!res.ok) throw new Error('Failed to fetch transactions');
        const transactionsForPortfolio: TransactionItem[] = await res.json();

        // Sort once before assigning, avoids extra reactivity triggering
        transactionsForPortfolio.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        transactions.value = [...transactionsForPortfolio].reverse();
        portfolios.value['default'] = [];
        portfolios.value['all'] = [];

        // prefetch stock quotes for all transactions and saves them in the cache
        await _prefetchStockQuotes();

        for (const transaction of transactionsForPortfolio) {
            const key = transaction.account?.name ?? 'default';
            if (!portfolios.value[key] && key !== 'default') portfolios.value[key] = [];

            await _updatePortfolio(key, transaction);
        }

        for (const key in portfolios.value) {
            portfolios.value[key].sort((a, b) => a.symbol.ticker.localeCompare(b.symbol.ticker));
        }
    }

    async function addTransaction(transaction: TransactionItem) {
        if (
            transaction.transaction_type === 'DIVIDEND' &&
            !transactions.value.find((t) => t.symbol.ticker === transaction.symbol.ticker)
        ) {
            // to create a dividend transaction, the stock must already exist
            throw 'A dividend was created before the stock was created, please create the stock first';
        }

        const res = await fetch('/api/transactions', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(transaction),
        });
        if (!res.ok) throw new Error('Failed to add transaction');
        const newTransaction = await res.json();
        transactions.value.unshift(newTransaction);
        _updatePortfolio(newTransaction.account?.name ?? 'default', newTransaction);
    }

    async function removeTransaction(transaction: TransactionItem) {
        const lastIndex = transactions.value.lastIndexOf(transaction);
        if (lastIndex < 0) {
            return;
        }

        const res = await fetch(`/api/transactions/${transaction.id}`, {
            method: 'DELETE',
            credentials: 'include',
        });
        if (!res.ok) throw new Error('Failed to remove transaction');

        transactions.value.splice(lastIndex, 1);
        _removeTransactionFromPortfolio(transaction.account?.name ?? 'default', transaction);
    }

    async function transferStock(symbol: string, fromAccount?: string, toAccount?: string) {
        if (fromAccount === toAccount) return;

        const newAccount = toAccount ? accounts.value.find((a) => a.name === toAccount) : undefined;
        for (const transaction of transactions.value) {
            if (transaction.symbol.ticker === symbol && transaction.account?.name === fromAccount) {
                const updated_transaction = await fetch(`/api/transactions/${transaction.id}`, {
                    method: 'PUT',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ account_id: newAccount?.id }),
                });
                if (!updated_transaction.ok) throw new Error('Failed to update transaction account');
                transaction.account = (await updated_transaction.json()).account;
            }
        }

        const fromPortfolio = portfolios.value[fromAccount ?? 'default'];
        let toPortfolio = portfolios.value[toAccount ?? 'default'];
        if (!toPortfolio && toAccount) {
            portfolios.value[toAccount] = [];
            toPortfolio = portfolios.value[toAccount];
        }

        if (!toPortfolio) throw new Error(`Portfolio for account ${toAccount} not found`);
        if (!fromPortfolio) throw new Error(`Portfolio for account ${fromAccount} not found`);

        // remove from the old portfolio
        const fromIdx = fromPortfolio.findIndex((item) => item.symbol.ticker === symbol);
        const item = fromPortfolio[fromIdx];
        fromPortfolio.splice(fromIdx, 1);
        portfolios.value[fromAccount ?? 'default'] = [...fromPortfolio];

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
        portfolios.value[toAccount ?? 'default'] = [...toPortfolio];
    }

    async function updateManualPrice(symbol_id: number, price?: number) {
        const updatedSymbol = await updateSymbolManualPrice(symbol_id, price);
        const portfolio = portfolios.value[_accountKey.value];
        for (const item of portfolio) {
            if (item.symbol.id === symbol_id) {
                item.currentPrice = updatedSymbol?.manual_price ?? 0;
                item.manualInputedPrice = true;
                break;
            }
        }
    }

    async function _prefetchStockQuotes() {
        const symbols = [
            ...new Set(
                transactions.value
                    .filter((t) => t.symbol.source && !manualPrices.value[t.symbol.ticker])
                    .map((t) => `${t.symbol.source}|${t.symbol.ticker}`)
            ),
        ].map((s) => s.split('|') as [string, string]);
        for (let i = 0; i < symbols.length; i += 5) {
            const batch = symbols.slice(i, i + 5);
            await Promise.all(batch.map(([source, symbol]) => stockStore.getStockQuote(source, symbol)));
        }
    }

    async function _updatePortfolio(portfolioKey: string, transaction: TransactionItem) {
        if (transaction.transaction_type === 'DIVIDEND-CASH') {
            cashDividends.value += transaction.price;
            return;
        }

        const portfolio = portfolios.value[portfolioKey];
        if (!portfolio) throw new Error('portfolio not found');

        const idx = portfolio.findIndex((item) => item.symbol.ticker === transaction.symbol.ticker);
        if (idx >= 0) {
            if (transaction.transaction_type === 'BUY') {
                portfolio[idx].quantity += transaction.quantity;
                portfolio[idx].currentInvested += transaction.price * transaction.quantity;
                portfolio[idx].totalInvested += transaction.price * transaction.quantity;
                portfolio[idx].commission += transaction.commission;
                portfolio[idx].sortedBuys.push({ ...transaction });
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
                portfolio[idx].sortedSells.push({ ...transaction, costBasis });
            } else if (transaction.transaction_type === 'DIVIDEND') {
                portfolio[idx].quantity += transaction.quantity;
            }
        } else {
            if (!transaction.symbol.source)
                throw new Error('A dividend was created before the stock was created, please create the stock first');

            let currentPrice: number;
            if (manualPrices.value[transaction.symbol.ticker]) {
                currentPrice = manualPrices.value[transaction.symbol.ticker]!;
            } else {
                const quote = await stockStore.getStockQuote(transaction.symbol.source, transaction.symbol.ticker);
                currentPrice = (quote?.current || 0) * conversionRate.value;
            }

            portfolio.push({
                symbol: transaction.symbol,
                currency: transaction.currency,
                quantity: transaction.quantity,
                currentPrice: currentPrice,
                manualInputedPrice: !!manualPrices.value[transaction.symbol.ticker],
                currentInvested: transaction.price * transaction.quantity,
                totalInvested: transaction.price * transaction.quantity,
                totalRetrieved: 0,
                commission: transaction.commission,
                sortedBuys: [transaction],
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
        return portfolio
            .filter((p) => p.quantity > 0)
            .reduce((acc, item) => acc + item.currentPrice * item.quantity, 0);
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
        manualPrices,
        totalInvested,
        portfolioCurrentValue,
        closedPositions,
        rentability,
    };
});
