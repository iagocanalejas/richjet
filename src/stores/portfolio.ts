import { defineStore } from "pinia";
import { type PortfolioItem } from "@/types/finnhub";
import { ref, type Ref } from "vue";
import { useTransactionStore } from "./transactions";

export const usePortfolioStore = defineStore("portfolio", () => {
    const portfolio: Ref<PortfolioItem[]> = ref([]);

    function _loadPortfolio() {
        const { transactions } = useTransactionStore();
        transactions.forEach((transaction) => {
            const idx = portfolio.value.findIndex((item) => item.symbol === transaction.symbol);
            if (idx >= 0) {
                if (transaction.transactionType === "buy") {
                    portfolio.value[idx].quantity += transaction.quantity;
                    portfolio.value[idx].totalPrice += transaction.price * transaction.quantity;
                } else {
                    portfolio.value[idx].quantity -= transaction.quantity;
                    portfolio.value[idx].totalPrice -= transaction.price * transaction.quantity;
                }
            } else {
                portfolio.value.push({
                    symbol: transaction.symbol,
                    image: transaction.image,
                    type: transaction.type,
                    quantity: transaction.quantity,
                    totalPrice: transaction.price * transaction.quantity,
                    currentPrice: 0.0,
                });
            }
        });
    }

    return { _loadPortfolio, portfolio };
});
