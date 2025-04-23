import { defineStore, storeToRefs } from "pinia";
import { type PortfolioItem, type TransactionItem } from "@/types/stock";
import { ref, type Ref } from "vue";
import { useStocksStore } from "./stocks";
import { useGoogleStore } from "./google";
import { useSettingsStore } from "./settings";

export const usePortfolioStore = defineStore("portfolio", () => {
	const portfolio: Ref<PortfolioItem[]> = ref([]);
	const transactions = ref<TransactionItem[]>([]);
	const cashDividends = ref(0);

	const stockStore = useStocksStore();
	const googleStore = useGoogleStore();
	const { conversionRate } = storeToRefs(useSettingsStore());

	async function init(loadedTransactions?: TransactionItem[]) {
		const transactionsForPortfolio = loadedTransactions ?? [];

		// Sort once before assigning, avoids extra reactivity triggering if using Vue
		transactionsForPortfolio.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
		transactions.value = [...transactionsForPortfolio].reverse();
		portfolio.value = [];

		// prefetch stock quotes for all transactions and saves them in the cache
		await _prefetchStockQuotes();

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
		console.log("synced from addTransaction");
		googleStore.syncData();
		_updatePortfolio(transaction);
	}

	function removeTransaction(transaction: TransactionItem) {
		let lastIndex = transactions.value.lastIndexOf(transaction);
		if (lastIndex < 0) {
			return;
		}

		transactions.value.splice(lastIndex, 1);
		console.log("synced from removeTransaction");
		googleStore.syncData();

		// inverse update the portfolio
		const idx = portfolio.value.findIndex((item) => item.symbol === transaction.symbol);
		if (transaction.transactionType === "buy") {
			portfolio.value[idx].quantity -= transaction.quantity;
			if (portfolio.value[idx].quantity <= 0) {
				portfolio.value.splice(idx, 1);
				return;
			}
			portfolio.value[idx].currentInvested -= transaction.price * transaction.quantity;
			portfolio.value[idx].totalInverted -= transaction.price * transaction.quantity;
			portfolio.value[idx].comission -= transaction.comission;
		} else if (transaction.transactionType === "sell") {
			portfolio.value[idx].quantity += transaction.quantity;
			portfolio.value[idx].currentInvested += transaction.price * transaction.quantity;
			portfolio.value[idx].totalRetrieved -= transaction.price * transaction.quantity;
			portfolio.value[idx].comission -= transaction.comission;
		} else if (transaction.transactionType === "dividend") {
			portfolio.value[idx].quantity -= transaction.quantity;
		} else if (transaction.transactionType === "dividend-cash") {
			cashDividends.value -= transaction.price;
		}
	}

	async function _prefetchStockQuotes() {
		const symbols = [...new Set(transactions.value
			.filter(t => t.source)
			.map((transaction) => [transaction.source!, transaction.symbol])
		)];
		for (let i = 0; i < symbols.length; i += 5) {
			const batch = symbols.slice(i, i + 5);
			await Promise.all(batch.map(([source, symbol]) => stockStore.getStockQuote(source, symbol)));
		}

	}

	async function _updatePortfolio(transaction: TransactionItem) {
		if (transaction.transactionType === "dividend-cash") {
			cashDividends.value += transaction.price;
			return;
		}

		const idx = portfolio.value.findIndex((item) => item.symbol === transaction.symbol);
		if (idx >= 0) {
			if (transaction.transactionType === "buy") {
				portfolio.value[idx].quantity += transaction.quantity;
				portfolio.value[idx].currentInvested += transaction.price * transaction.quantity;
				portfolio.value[idx].totalInverted += transaction.price * transaction.quantity;
				portfolio.value[idx].comission += transaction.comission;
			} else if (transaction.transactionType === "sell") {
				portfolio.value[idx].quantity -= transaction.quantity;
				portfolio.value[idx].currentInvested -= transaction.price * transaction.quantity;
				portfolio.value[idx].totalRetrieved += transaction.price * transaction.quantity;
				portfolio.value[idx].comission += transaction.comission;
			} else if (transaction.transactionType === "dividend") {
				portfolio.value[idx].quantity += transaction.quantity;
			}
		} else {
			if (!transaction.source) {
				alert("A dividend was created before the stock was created, please create the stock first");
				return;
			}

			const quote = await stockStore.getStockQuote(transaction.source, transaction.symbol);
			if (!quote) console.error(`Failed to fetch quote for ${transaction.symbol}`);

			portfolio.value.push({
				symbol: transaction.symbol,
				image: transaction.image,
				type: transaction.type,
				currency: transaction.currency,
				quantity: transaction.quantity,
				currentPrice: (quote?.current || 0) * conversionRate.value,
				currentInvested: transaction.price * transaction.quantity,
				totalInverted: transaction.price * transaction.quantity,
				totalRetrieved: 0,
				comission: transaction.comission,
			});
		}
	}

	return { init, portfolio, transactions, cashDividends, addTransaction, removeTransaction };
});
