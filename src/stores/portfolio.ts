import { defineStore } from "pinia";
import { type PortfolioItem, type TransactionItem } from "@/types/finnhub";
import { ref, type Ref } from "vue";
import { useFinnhubStore } from "./finnhub";

export const usePortfolioStore = defineStore("portfolio", () => {
    const portfolio: Ref<PortfolioItem[]> = ref([]);
    const transactions = ref<TransactionItem[]>([]);

    const finnhubStore = useFinnhubStore();

    async function init() {
        console.log("loading transactions from localStorage");
        const storedTransactions = localStorage.getItem("transactions");
        transactions.value = storedTransactions ? JSON.parse(storedTransactions) : [];

        transactions.value.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        transactions.value.forEach(_updatePortfolio);
    }

    function addTransaction(transaction: TransactionItem) {
        transactions.value.push(transaction);
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
            portfolio.value[idx].totalPrice -= transaction.price * transaction.quantity;
            portfolio.value[idx].comission -= transaction.comission;
            if (portfolio.value[idx].quantity <= 0) {
                portfolio.value.splice(idx, 1);
            }
        } else {
            portfolio.value[idx].quantity += transaction.quantity;
            portfolio.value[idx].totalPrice += transaction.price * transaction.quantity;
            portfolio.value[idx].comission -= transaction.comission;
        }
    }

    async function _updatePortfolio(transaction: TransactionItem) {
        const idx = portfolio.value.findIndex((item) => item.symbol === transaction.symbol);
        if (idx >= 0) {
            if (transaction.transactionType === "buy") {
                portfolio.value[idx].quantity += transaction.quantity;
                portfolio.value[idx].totalPrice += transaction.price * transaction.quantity;
                portfolio.value[idx].comission += transaction.comission;
            } else {
                portfolio.value[idx].quantity -= transaction.quantity;
                portfolio.value[idx].totalPrice -= transaction.price * transaction.quantity;
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
                quantity: transaction.quantity,
                totalPrice: transaction.price * transaction.quantity,
                currentPrice: quote?.c || 0.0,
                currency: transaction.currency,
                comission: transaction.comission,
            });
        }
    }

    return { init, portfolio, transactions, addTransaction, removeTransaction };
});
