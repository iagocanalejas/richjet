import { defineStore, storeToRefs } from "pinia";
import { type PortfolioItem, type TransactionItem } from "@/types/portfolio";
import { computed, ref, type Ref } from "vue";
import { useStocksStore } from "./stocks";
import { useGoogleStore } from "./google";
import { useSettingsStore } from "./settings";

export const usePortfolioStore = defineStore("portfolio", () => {
	const portfolio: Ref<PortfolioItem[]> = ref([]);
	const transactions = ref<TransactionItem[]>([]);
	const manualPrices = ref<{ [k: string]: number }>({});
	const cashDividends = ref(0);

	const stockStore = useStocksStore();
	const googleStore = useGoogleStore();
	const { conversionRate } = storeToRefs(useSettingsStore());

	async function init(loadedTransactions?: TransactionItem[], loadedManualPrices?: { [k: string]: number }) {
		const transactionsForPortfolio = loadedTransactions ?? [];

		// Sort once before assigning, avoids extra reactivity triggering if using Vue
		transactionsForPortfolio.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
		transactions.value = [...transactionsForPortfolio].reverse();
		manualPrices.value = loadedManualPrices ?? {};
		portfolio.value = [];

		// prefetch stock quotes for all transactions and saves them in the cache
		await _prefetchStockQuotes();

		for (const transaction of transactionsForPortfolio) {
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
		const lastIndex = transactions.value.lastIndexOf(transaction);
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
			portfolio.value[idx].totalInvested -= transaction.price * transaction.quantity;
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

	function updateManualPrice(symbol: string, price: number | null) {
		if (price === null) {
			delete manualPrices.value[symbol];
			return;
		}
		if (price < 0) throw new Error("Price cannot be negative");
		for (const item of portfolio.value) {
			if (item.symbol === symbol) {
				item.currentPrice = price;
				item.manualInputedPrice = true;
				break;
			}
		}
		manualPrices.value[symbol] = price;
		googleStore.syncData();
	}

	async function _prefetchStockQuotes() {
		const symbols = [
			...new Set(transactions.value
				.filter(t => t.source && !manualPrices.value[t.symbol])
				.map(t => `${t.source}|${t.symbol}`))
		].map(s => s.split('|') as [string, string]);
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
				portfolio.value[idx].totalInvested += transaction.price * transaction.quantity;
				portfolio.value[idx].comission += transaction.comission;
			} else if (transaction.transactionType === "sell") {
				const avgPrice = portfolio.value[idx].currentInvested / portfolio.value[idx].quantity;
				portfolio.value[idx].quantity -= transaction.quantity;
				portfolio.value[idx].currentInvested -= avgPrice * transaction.quantity;
				portfolio.value[idx].totalRetrieved += transaction.price * transaction.quantity;
				portfolio.value[idx].comission += transaction.comission;
			} else if (transaction.transactionType === "dividend") {
				portfolio.value[idx].quantity += transaction.quantity;
			}
		} else {
			if (!transaction.source) throw new Error("A dividend was created before the stock was created, please create the stock first");


			let currentPrice: number;
			if (manualPrices.value[transaction.symbol]) {
				currentPrice = manualPrices.value[transaction.symbol]!;
			} else {
				const quote = await stockStore.getStockQuote(transaction.source, transaction.symbol);
				if (!quote) console.error(`Failed to fetch quote for ${transaction.symbol}`);
				currentPrice = (quote?.current || 0) * conversionRate.value;
			}

			portfolio.value.push({
				symbol: transaction.symbol,
				image: transaction.image,
				type: transaction.type,
				currency: transaction.currency,
				quantity: transaction.quantity,
				currentPrice: currentPrice,
				manualInputedPrice: !!manualPrices.value[transaction.symbol],
				currentInvested: transaction.price * transaction.quantity,
				totalInvested: transaction.price * transaction.quantity,
				totalRetrieved: 0,
				comission: transaction.comission,
			});
		}
	}

	const totalInvested = computed(() => {
		return portfolio.value
			.filter((p) => p.quantity > 0)
			.reduce((acc, item) => acc + item.currentInvested + item.comission, 0);
	});

	const portfolioCurrentValue = computed(() => {
		return portfolio.value
			.filter((p) => p.quantity > 0)
			.reduce((acc, item) => acc + item.currentPrice * item.quantity, 0);
	});

	const closedPositions = computed(() => {
		return portfolio.value.reduce((total, item) => {
			const { quantity, totalRetrieved, totalInvested, currentInvested, comission } = item;
			const currentlyInvested = quantity === 0 ? totalInvested + comission : (totalInvested - currentInvested) + comission;
			return total + (totalRetrieved - currentlyInvested);
		}, 0);
	});


	const rentability = computed(() => {
		return totalInvested.value
			? ((portfolioCurrentValue.value + closedPositions.value + cashDividends.value - totalInvested.value) / totalInvested.value) * 100
			: 0;
	});

	return {
		init,
		portfolio,
		transactions,
		cashDividends,
		addTransaction,
		removeTransaction,
		updateManualPrice,
		manualPrices,
		totalInvested,
		portfolioCurrentValue,
		closedPositions,
		rentability,
	};
});
