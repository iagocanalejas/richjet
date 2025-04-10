import { defineStore } from "pinia";
import { type PortfolioItem, type TransactionItem } from "@/types/finnhub";
import { ref, type Ref } from "vue";
import { useFinnhubStore } from "./finnhub";

export const usePortfolioStore = defineStore("portfolio", () => {
    const portfolio: Ref<PortfolioItem[]> = ref([]);
    const transactions = ref<TransactionItem[]>([]);

    const finnhubStore = useFinnhubStore();

    // TODO: change localStorage to use GDrive
    async function init() {
        console.log("loading transactions from localStorage");
        const stored = localStorage.getItem("transactions");
        const transactionsForPortfolio: TransactionItem[] = stored ? JSON.parse(stored) : [];

        // Sort once before assigning, avoids extra reactivity triggering if using Vue
        transactionsForPortfolio.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        transactions.value = [...transactionsForPortfolio].reverse();

        for (let transaction of transactionsForPortfolio) {
            await _updatePortfolio(transaction);
        }

        portfolio.value.sort((a, b) => {
            if (a.quantity === 0 && b.quantity !== 0) return 1;
            if (a.quantity !== 0 && b.quantity === 0) return -1;
            return a.currentInvested - b.currentInvested;
        });
    }

    function addTransaction(transaction: TransactionItem) {
        transactions.value.unshift(transaction);
        localStorage.setItem("transactions", JSON.stringify(transactions.value));
        _updatePortfolio(transaction);
    }

    function removeTransaction(transaction: TransactionItem) {
        let lastIndex = transactions.value.lastIndexOf(transaction);
        if (lastIndex >= 0) {
            return;
        }

        transactions.value.splice(lastIndex, 1);
        localStorage.setItem("transactions", JSON.stringify(transactions.value));

        // inverse update the portfolio
        const idx = portfolio.value.findIndex((item) => item.symbol === transaction.symbol);
        if (transaction.type === "buy") {
            portfolio.value[idx].quantity -= transaction.quantity;
            if (portfolio.value[idx].quantity <= 0) {
                portfolio.value.splice(idx, 1);
                return;
            }
            portfolio.value[idx].currentInvested -= transaction.price * transaction.quantity;
            portfolio.value[idx].totalInverted -= transaction.price * transaction.quantity;
            portfolio.value[idx].comission -= transaction.comission;
        } else {
            portfolio.value[idx].quantity += transaction.quantity;
            portfolio.value[idx].currentInvested += transaction.price * transaction.quantity;
            portfolio.value[idx].totalRetrieved -= transaction.price * transaction.quantity;
            portfolio.value[idx].comission -= transaction.comission;
        }
    }

    async function _updatePortfolio(transaction: TransactionItem) {
        const idx = portfolio.value.findIndex((item) => item.symbol === transaction.symbol);
        if (idx >= 0) {
            if (transaction.transactionType === "buy") {
                portfolio.value[idx].quantity += transaction.quantity;
                portfolio.value[idx].currentInvested += transaction.price * transaction.quantity;
                portfolio.value[idx].totalInverted += transaction.price * transaction.quantity;
                portfolio.value[idx].comission += transaction.comission;
            } else {
                portfolio.value[idx].quantity -= transaction.quantity;
                portfolio.value[idx].currentInvested -= transaction.price * transaction.quantity;
                portfolio.value[idx].totalRetrieved += transaction.price * transaction.quantity;
                portfolio.value[idx].comission += transaction.comission;
            }
        } else {
            const quote = await finnhubStore.getStockQuote(transaction.symbol);
            if (!quote) {
                console.error(`Failed to fetch quote for ${transaction.symbol}`);
            }
            portfolio.value.push({
                symbol: transaction.symbol,
                image: transaction.image,
                type: transaction.type,
                currency: transaction.currency,
                quantity: transaction.quantity,
                currentPrice: quote?.c || 0.0,
                currentInvested: transaction.price * transaction.quantity,
                totalInverted: transaction.price * transaction.quantity,
                totalRetrieved: 0,
                comission: transaction.comission,
            });
        }
    }

    return { init, portfolio, transactions, addTransaction, removeTransaction };
});
