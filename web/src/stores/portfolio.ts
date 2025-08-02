import { defineStore, storeToRefs } from 'pinia';
import { type PortfolioItem, type TransactionItem } from '@/types/portfolio';
import { computed, toRaw } from 'vue';
import { useStocksStore } from './stocks';
import { useSettingsStore } from './settings';
import { useTransactionsStore } from './transactions';
import { isSavingsAccount } from '@/utils/rules';

export const usePortfolioStore = defineStore('portfolio', () => {
    const { transactions, cashDividends } = storeToRefs(useTransactionsStore());
    const { account, accounts } = storeToRefs(useSettingsStore());
    const { conversionRate } = storeToRefs(useSettingsStore());
    const { getStockQuoteSync } = useStocksStore();

    const _accountKey = computed(() => account.value?.name ?? 'all');

    const portfolio = computed<PortfolioItem[]>(() => {
        const _portfolio: PortfolioItem[] = [];
        const accountTransactions =
            _accountKey.value === 'all'
                ? transactions.value
                : transactions.value.filter((t) => t.account?.name === _accountKey.value);

        const trsBySymbol: Record<string, TransactionItem[]> = {};
        for (const tr of accountTransactions) {
            trsBySymbol[tr.symbol.id] = trsBySymbol[tr.symbol.id] || [];
            trsBySymbol[tr.symbol.id].push(tr);
        }

        for (const symbolId in trsBySymbol) {
            _portfolio.push(_createPortfolioItem(trsBySymbol[symbolId].reverse()));
        }

        _portfolio.sort((a, b) => a.symbol.ticker.localeCompare(b.symbol.ticker));
        return _portfolio;
    });

    function _createPortfolioItem(transactions: TransactionItem[]) {
        const firstTr = transactions.shift()!;
        if (firstTr.transaction_type !== 'BUY') {
            throw new Error(`First transaction for symbol ${firstTr.symbol.ticker} must be a BUY transaction`);
        }

        const currentPrice = !firstTr.symbol.manual_price
            ? (getStockQuoteSync(firstTr.symbol)?.current || 0) * conversionRate.value
            : firstTr.symbol.manual_price;

        const portfolioItem = {
            symbol: firstTr.symbol,
            currency: firstTr.currency,
            quantity: firstTr.quantity,
            currentPrice: currentPrice,
            currentInvested: firstTr.quantity * firstTr.price,
            totalInvested: firstTr.quantity * firstTr.price,
            totalRetrieved: 0,
            commission: firstTr.commission,
            sortedBuys: [structuredClone(toRaw(firstTr))],
            sortedSells: [] as (TransactionItem & { costBasis: number })[],
        };

        for (const tr of transactions) {
            switch (tr.transaction_type) {
                case 'BUY':
                    portfolioItem.quantity += tr.quantity;
                    portfolioItem.currentInvested += tr.quantity * tr.price;
                    portfolioItem.totalInvested += tr.quantity * tr.price;
                    portfolioItem.commission += tr.commission;
                    portfolioItem.sortedBuys.push(structuredClone(toRaw(tr)));
                    break;
                case 'SELL':
                    let remainingToSell = tr.quantity;
                    let costBasis = 0;

                    // Apply FIFO: consume from earliest buys first
                    while (remainingToSell > 0 && portfolioItem.sortedBuys.length > 0) {
                        const buy = portfolioItem.sortedBuys[0];
                        if (buy.quantity <= remainingToSell) {
                            // Fully consume this buy
                            costBasis += buy.quantity * buy.price;
                            remainingToSell -= buy.quantity;
                            portfolioItem.sortedBuys.shift();
                        } else {
                            // Partially consume this buy
                            costBasis += remainingToSell * buy.price;
                            buy.quantity -= remainingToSell;
                            remainingToSell = 0;
                        }
                    }

                    portfolioItem.quantity -= tr.quantity;
                    portfolioItem.currentInvested -= costBasis;
                    portfolioItem.totalRetrieved += tr.price * tr.quantity;
                    portfolioItem.commission += tr.commission;
                    portfolioItem.sortedSells.push({ ...structuredClone(toRaw(tr)), costBasis });
                    break;
                case 'DIVIDEND':
                    portfolioItem.quantity += tr.quantity;
                    break;
                case 'DIVIDEND-CASH':
                    break;
            }
        }
        return portfolioItem;
    }

    const totalInvested = computed(() => {
        if (!portfolio.value.length) return 0;
        return portfolio.value
            .filter((p) => p.quantity > 0)
            .reduce((acc, item) => acc + item.currentInvested + item.commission, 0);
    });

    const portfolioCurrentValue = computed(() => {
        if (!portfolio.value.length) return savingAccountsValue.value;
        const portfoliosValue = portfolio.value
            .filter((p) => p.quantity > 0)
            .reduce((acc, item) => acc + item.currentPrice * item.quantity, 0);
        return portfoliosValue + savingAccountsValue.value;
    });

    const savingAccountsValue = computed(() => {
        const money = accounts.value.filter((a) => isSavingsAccount(a)).reduce((acc, a) => acc + a.balance!, 0) ?? 0;
        return money * conversionRate.value;
    });

    const closedPositions = computed(() => {
        if (!portfolio.value.length) return 0;
        return portfolio.value.reduce((total, item) => {
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

    function addtest(t: TransactionItem) {
        transactions.value.push(t);
    }

    return {
        portfolio,
        totalInvested,
        portfolioCurrentValue,
        savingAccountsValue,
        closedPositions,
        rentability,
        addtest,
    };
});
