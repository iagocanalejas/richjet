import { defineStore } from "pinia";
import { type TransactionItem } from "@/types/finnhub";
import { ref } from "vue";

export const useTransactionStore = defineStore("transaction", () => {
    const transactions = ref<TransactionItem[]>([]);

    function init() {
        console.log("loading transactions from localStorage");
        const storedTransactions = localStorage.getItem("transactions");
        transactions.value = storedTransactions ? JSON.parse(storedTransactions) : [];
    }

    function addTransaction(transaction: TransactionItem) {
        transactions.value.unshift(transaction);
        localStorage.setItem("transactions", JSON.stringify(transactions.value));
    }

    function removeTransaction(transaction: TransactionItem) {
        let lastIndex = transactions.value.lastIndexOf(transaction);

        if (lastIndex !== -1) {
            transactions.value.splice(lastIndex, 1);
            localStorage.setItem("transactions", JSON.stringify(transactions.value));
        }
    }

    return { init, addTransaction, removeTransaction, transactions };
});
