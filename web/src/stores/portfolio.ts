import { defineStore, storeToRefs } from "pinia";
import { type PortfolioItem, type TransactionItem } from "@/types/portfolio";
import { computed, ref, type Ref } from "vue";
import { useStocksStore } from "./stocks";
import { useGoogleStore } from "./google";
import { useSettingsStore } from "./settings";

export const usePortfolioStore = defineStore("portfolio", () => {
	const portfolios: Ref<{ [key: string]: PortfolioItem[] }> = ref({ 'default': [], 'all': [] });
	const transactions = ref<TransactionItem[]>([]);
	const manualPrices = ref<{ [k: string]: number }>({});
	const cashDividends = ref(0);

	const stockStore = useStocksStore();
	const googleStore = useGoogleStore();
	const { conversionRate, account, accounts } = storeToRefs(useSettingsStore());

	const _accountKey = computed(() => account.value?.name ?? "all");
	const portfolio = computed(() => portfolios.value[_accountKey.value] ?? []);

	async function init(loadedTransactions?: TransactionItem[], loadedManualPrices?: { [k: string]: number }) {
		const transactionsForPortfolio = loadedTransactions ?? [];

		// Sort once before assigning, avoids extra reactivity triggering
		transactionsForPortfolio.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
		transactions.value = [...transactionsForPortfolio].reverse();
		manualPrices.value = loadedManualPrices ?? {};
		portfolios.value['default'] = [];
		portfolios.value['all'] = [];

		// prefetch stock quotes for all transactions and saves them in the cache
		await _prefetchStockQuotes();

		for (const transaction of transactionsForPortfolio) {
			const key = transaction.account?.name ?? "default";
			if (!portfolios.value[key] && key !== "default") portfolios.value[key] = []

			await _updatePortfolio(key, transaction);
		}

		for (const key in portfolios.value) {
			portfolios.value[key].sort((a, b) => a.symbol.localeCompare(b.symbol));
		}
	}

	function addTransaction(transaction: TransactionItem) {
		transactions.value.unshift(transaction);
		console.log("synced from addTransaction");
		googleStore.syncData();
		_updatePortfolio(transaction.account?.name ?? "default", transaction);
	}

	function removeTransaction(transaction: TransactionItem) {
		const lastIndex = transactions.value.lastIndexOf(transaction);
		if (lastIndex < 0) {
			return;
		}

		transactions.value.splice(lastIndex, 1);
		console.log("synced from removeTransaction");
		googleStore.syncData();
		_removeTransactionFromPortfolio(transaction.account?.name ?? "default", transaction)
	}

	function transferStock(symbol: string, fromAccount?: string, toAccount?: string) {
		if (fromAccount === toAccount) return;

		const newAccount = toAccount ? accounts.value.find(a => a.name === toAccount) : undefined;
		for (const transaction of transactions.value) {
			if (transaction.symbol === symbol && transaction.account?.name === fromAccount) {
				transaction.account = newAccount;
			}
		}

		const fromPortfolio = portfolios.value[fromAccount ?? "default"];
		const toPortfolio = portfolios.value[toAccount ?? "default"];

		// remove from the old portfolio
		const fromIdx = fromPortfolio.findIndex((item) => item.symbol === symbol);
		const item = fromPortfolio[fromIdx];
		fromPortfolio.splice(fromIdx, 1);
		portfolios.value[fromAccount ?? "default"] = [...fromPortfolio];

		// add to the new portfolio
		const toIdx = toPortfolio.findIndex((item) => item.symbol === symbol);
		if (toIdx >= 0) {
			toPortfolio[toIdx].quantity += item.quantity;
			toPortfolio[toIdx].currentInvested += item.currentInvested;
			toPortfolio[toIdx].totalInvested += item.totalInvested;
			toPortfolio[toIdx].comission += item.comission;
			toPortfolio[toIdx].sortedBuys.push(...item.sortedBuys);
			toPortfolio[toIdx].sortedBuys.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
			toPortfolio[toIdx].sortedSells.push(...item.sortedSells);
			toPortfolio[toIdx].sortedSells.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
		} else {
			toPortfolio.push({ ...item });
		}
		toPortfolio.sort((a, b) => a.symbol.localeCompare(b.symbol));
		portfolios.value[toAccount ?? "default"] = [...toPortfolio];
	}

	function updateManualPrice(symbol: string, price?: number) {
		if (!price) {
			delete manualPrices.value[symbol];
			return;
		}

		if (price < 0) throw new Error("Price cannot be negative");
		if (isNaN(price)) throw new Error("Price must be a number");

		const portfolio = portfolios.value[_accountKey.value];
		for (const item of portfolio) {
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

	async function _updatePortfolio(portfolioKey: string, transaction: TransactionItem) {
		if (transaction.transactionType === "dividend-cash") {
			cashDividends.value += transaction.price;
			return;
		}

		const portfolio = portfolios.value[portfolioKey];
		if (!portfolio) throw new Error("portfolio not found");

		const idx = portfolio.findIndex((item) => item.symbol === transaction.symbol);
		if (idx >= 0) {
			if (transaction.transactionType === "buy") {
				portfolio[idx].quantity += transaction.quantity;
				portfolio[idx].currentInvested += transaction.price * transaction.quantity;
				portfolio[idx].totalInvested += transaction.price * transaction.quantity;
				portfolio[idx].comission += transaction.comission;
				portfolio[idx].sortedBuys.push({ ...transaction });
			} else if (transaction.transactionType === "sell") {
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
				portfolio[idx].comission += transaction.comission;
				portfolio[idx].sortedSells.push({ ...transaction, costBasis });
			} else if (transaction.transactionType === "dividend") {
				portfolio[idx].quantity += transaction.quantity;
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

			portfolio.push({
				symbol: transaction.symbol,
				name: transaction.name,
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
				sortedBuys: [transaction],
				sortedSells: [],
			});
		}

		// trigger Vue reactivity by creating a new reference
		portfolios.value[portfolioKey] = [...portfolio];
		if (portfolioKey !== "all") await _updatePortfolio("all", transaction);
	}

	function _removeTransactionFromPortfolio(portfolioKey: string, transaction: TransactionItem) {
		if (transaction.transactionType === "dividend-cash") {
			cashDividends.value -= transaction.price;
			return;
		}

		const portfolio = portfolios.value[portfolioKey];
		if (!portfolio) throw new Error("portfolio not found");

		const idx = portfolio.findIndex((item) => item.symbol === transaction.symbol);
		if (transaction.transactionType === "buy") {
			portfolio[idx].quantity -= transaction.quantity;
			if (portfolio[idx].quantity <= 0) {
				portfolio.splice(idx, 1);
				portfolios.value[portfolioKey] = [...portfolio];
				if (portfolioKey !== "all") _removeTransactionFromPortfolio("all", transaction);
				return;
			}
			portfolio[idx].currentInvested -= transaction.price * transaction.quantity;
			portfolio[idx].totalInvested -= transaction.price * transaction.quantity;
			portfolio[idx].comission -= transaction.comission;
			portfolio[idx].sortedBuys = portfolio[idx].sortedBuys.filter((t) => t !== transaction);
		} else if (transaction.transactionType === "sell") {
			portfolio[idx].quantity += transaction.quantity;
			portfolio[idx].currentInvested += transaction.price * transaction.quantity;
			portfolio[idx].totalRetrieved -= transaction.price * transaction.quantity;
			portfolio[idx].comission -= transaction.comission;
			portfolio[idx].sortedSells = portfolio[idx].sortedSells.filter((t) => t !== transaction);
		} else if (transaction.transactionType === "dividend") {
			portfolio[idx].quantity -= transaction.quantity;
		}

		// trigger Vue reactivity by creating a new reference
		portfolios.value[portfolioKey] = [...portfolio];
		if (portfolioKey !== "all") _removeTransactionFromPortfolio("all", transaction);
	}

	const totalInvested = computed(() => {
		const portfolio = portfolios.value[_accountKey.value];
		if (!portfolio) return 0;
		return portfolio
			.filter((p) => p.quantity > 0)
			.reduce((acc, item) => acc + item.currentInvested + item.comission, 0);
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
