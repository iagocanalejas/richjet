import { defineStore, storeToRefs } from 'pinia';
import { type PortfolioItem, type TransactionItem } from '@/types/portfolio';
import { computed, toRaw } from 'vue';
import { useStocksStore } from './stocks';
import { useSettingsStore } from './settings';
import { useTransactionsStore } from './transactions';
import { isSavingsAccount } from '@/utils/rules';

export const usePortfolioStore = defineStore('portfolio', () => {
    const settingsStore = useSettingsStore();
    const { transactions, cashDividends } = storeToRefs(useTransactionsStore());
    const { account, accounts } = storeToRefs(settingsStore);
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
            (trsBySymbol[tr.symbol.id] ??= []).push(tr);
        }

        for (const symbolId in trsBySymbol) {
            _portfolio.push(_createPortfolioItem(trsBySymbol[symbolId]!.reverse()));
        }

        _portfolio.sort((a, b) => {
            if (a.quantity === 0) return 1;
            if (b.quantity === 0) return -1;
            return a.symbol.display_name.localeCompare(b.symbol.display_name);
        });
        return _portfolio;
    });

    function _createPortfolioItem(transactions: TransactionItem[]) {
        const firstTr = transactions.shift()!;
        if (firstTr.transaction_type !== 'BUY') {
            throw new Error(`First transaction for symbol ${firstTr.symbol.ticker} must be a BUY transaction`);
        }

        const conversionRate = settingsStore.getConvertionRate(firstTr.symbol.currency);
        const currentPrice = !firstTr.symbol.price
            ? (getStockQuoteSync(firstTr.symbol)?.current || 0) * conversionRate
            : firstTr.symbol.price;

        const portfolioItem: PortfolioItem = {
            symbol: firstTr.symbol,
            currency: firstTr.currency,
            quantity: firstTr.quantity,
            current_price: currentPrice,
            current_invested: firstTr.quantity * firstTr.price,
            total_invested: firstTr.quantity * firstTr.price,
            total_retrieved: 0,
            commission: firstTr.commission,
            sorted_buys: [structuredClone(toRaw(firstTr))],
            sorted_sells: [] as (TransactionItem & { cost_basis: number })[],
        };

        for (const tr of transactions) {
            switch (tr.transaction_type) {
                case 'BUY':
                    portfolioItem.quantity += tr.quantity;
                    portfolioItem.current_invested += tr.quantity * tr.price;
                    portfolioItem.total_invested += tr.quantity * tr.price;
                    portfolioItem.commission += tr.commission;
                    portfolioItem.sorted_buys.push(structuredClone(toRaw(tr)));
                    break;
                case 'SELL':
                    let remainingToSell = tr.quantity;
                    let cost_basis = 0;

                    // Apply FIFO: consume from earliest buys first
                    while (remainingToSell > 0 && portfolioItem.sorted_buys.length > 0) {
                        const buy = portfolioItem.sorted_buys[0];
                        if (!buy) break; // typescript is being a douchebag here

                        if (buy.quantity <= remainingToSell) {
                            // Fully consume this buy
                            cost_basis += buy.quantity * buy.price;
                            remainingToSell -= buy.quantity;
                            portfolioItem.sorted_buys.shift();
                        } else {
                            // Partially consume this buy
                            cost_basis += remainingToSell * buy.price;
                            buy.quantity -= remainingToSell;
                            remainingToSell = 0;
                        }
                    }

                    if (remainingToSell > 0) {
                        // NOTE: This situation should ideally never happen if data integrity is maintained.
                        console.warn(`Not enough shares for ${tr.symbol.ticker}. Remaining : ${remainingToSell}`);
                    }

                    portfolioItem.quantity -= tr.quantity;
                    portfolioItem.current_invested -= cost_basis;
                    portfolioItem.total_retrieved += tr.price * tr.quantity;
                    portfolioItem.commission += tr.commission;
                    portfolioItem.sorted_sells.push({ ...structuredClone(toRaw(tr)), cost_basis });
                    break;
                case 'DIVIDEND':
                    portfolioItem.quantity += tr.quantity;
                    portfolioItem.sorted_buys.push(structuredClone(toRaw(tr)));
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
            .reduce((acc, item) => acc + item.current_invested + item.commission, 0);
    });

    const portfolioCurrentValue = computed(() => {
        if (!portfolio.value.length) return 0.0;
        const portfoliosValue = portfolio.value
            .filter((p) => p.quantity > 0)
            .reduce((acc, item) => acc + item.current_price * item.quantity, 0);
        return portfoliosValue;
    });

    const savingAccountsValue = computed(() => {
        const money =
            accounts.value
                .filter((a) => isSavingsAccount(a))
                .reduce((acc, a) => acc + a.balance! * settingsStore.getConvertionRate(a.currency), 0) ?? 0;
        return money;
    });

    const closedPositions = computed(() => {
        if (!portfolio.value.length) return 0;
        return portfolio.value
            .filter((p) => p.sorted_sells.length > 0)
            .reduce((total, p) => {
                const earned = p.total_retrieved - (p.total_invested - p.current_invested);
                return total + earned - p.commission;
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
