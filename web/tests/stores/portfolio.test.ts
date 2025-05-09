import { setActivePinia, createPinia, StoreDefinition } from 'pinia';
import { describe, it, beforeEach, expect, vi } from 'vitest';
import { usePortfolioStore } from '../../src/stores/portfolio';
import { type TransactionItem } from '../../src/types/portfolio';
import { ref } from 'vue';

vi.mock('@/stores/google', () => ({
	useGoogleStore: () => ({
		syncData: vi.fn(),
	}),
}));

vi.mock('@/stores/settings', () => {
	return {
		useSettingsStore: () => ({
			conversionRate: ref(1),
			account: ref(),
			accounts: ref([{ name: 'accountA' }, { name: 'accountB' }]),
		}),
		storeToRefs: (store: StoreDefinition) => store,
	};
});

describe('usePortfolioStore', () => {
	let store: ReturnType<typeof usePortfolioStore>;
	const baseDate = new Date().toISOString();

	beforeEach(() => {
		setActivePinia(createPinia());
		store = usePortfolioStore();
	});

	it('initializes with empty state', () => {
		expect(store.portfolio).toEqual([]);
		expect(store.transactions).toEqual([]);
		expect(store.cashDividends).toBe(0);
	});

	describe('buy transaction', () => {
		it('adds a new stock to portfolio', async () => {
			const tx: TransactionItem = {
				symbol: 'AAPL',
				name: 'Apple Inc.',
				image: 'apple.png',
				type: 'stock',
				currency: 'USD',
				quantity: 5,
				price: 100,
				comission: 1,
				transactionType: 'buy',
				date: baseDate,
				source: 'nasdaq',
			};
			await store.init([tx]);
			expect(store.portfolio[0]).toMatchObject({
				symbol: 'AAPL',
				name: 'Apple Inc.',
				quantity: 5,
				currentInvested: 500,
				totalInvested: 500,
				comission: 1,
			});
		});
	});

	describe('sell transaction', () => {
		it('subtracts from quantity and adds to retrieved', async () => {
			const buy: TransactionItem = {
				symbol: 'AAPL',
				name: 'Apple Inc.',
				image: 'apple.png',
				type: 'stock',
				currency: 'USD',
				quantity: 10,
				price: 100,
				comission: 1,
				transactionType: 'buy',
				date: baseDate,
				source: 'nasdaq',
			};
			const sell: TransactionItem = {
				...buy,
				quantity: 4,
				price: 110,
				transactionType: 'sell',
				comission: 2,
			};
			await store.init([buy, sell]);

			expect(store.portfolio[0].quantity).toBe(6);
			expect(store.portfolio[0].totalRetrieved).toBe(440);
			expect(store.portfolio[0].currentInvested).toBe(600);
			expect(store.portfolio[0].comission).toBe(3);
		});

		it('applies FIFO logic when selling shares from multiple buys', async () => {
			const buy1: TransactionItem = {
				symbol: 'GOOG',
				name: 'Alphabet Inc.',
				image: '',
				type: 'stock',
				currency: 'USD',
				quantity: 5,
				price: 200, // $1000 total
				comission: 0,
				transactionType: 'buy',
				date: baseDate,
				source: 'nasdaq',
			};

			const buy2: TransactionItem = {
				...buy1,
				quantity: 5,
				price: 300, // $1500 total
				date: new Date(Date.now() + 1000).toISOString(), // later than buy1
			};

			const sell: TransactionItem = {
				...buy1,
				quantity: 7,
				price: 400,
				comission: 5,
				transactionType: 'sell',
				date: new Date(Date.now() + 2000).toISOString(),
			};

			await store.init([buy1, buy2, sell]);

			const position = store.portfolio[0];
			expect(position.quantity).toBe(3);
			expect(position.totalRetrieved).toBe(2800);
			expect(position.totalInvested).toBe(2500);
			expect(position.currentInvested).toBe(900);
			expect(position.comission).toBe(5);
			expect(position.sortedSells).toHaveLength(1);
			expect(position.sortedSells[0].costBasis).toBe(5 * 200 + 2 * 300);
		});
	});

	describe('dividend transaction', () => {
		it('adds to quantity only', async () => {
			const buy: TransactionItem = {
				symbol: 'T',
				name: 'AT&T Inc.',
				image: 't.png',
				type: 'stock',
				currency: 'USD',
				quantity: 10,
				price: 20,
				comission: 0,
				transactionType: 'buy',
				date: baseDate,
				source: 'nyse',
			};
			const dividend: TransactionItem = {
				...buy,
				quantity: 2,
				price: 0,
				transactionType: 'dividend',
			};
			await store.init([buy, dividend]);

			expect(store.portfolio[0].quantity).toBe(12);
		});
	});

	describe('dividend-cash transaction', () => {
		it('adds to cashDividends', async () => {
			const cashDividend: TransactionItem = {
				symbol: 'T',
				name: 'AT&T Inc.',
				image: 't.png',
				type: 'stock',
				currency: 'USD',
				quantity: 0,
				price: 100,
				comission: 0,
				transactionType: 'dividend-cash',
				date: baseDate,
			};
			await store.init([cashDividend]);
			expect(store.cashDividends).toBe(100);
		});
	});

	describe('removal logic', () => {
		it('removes a buy transaction and deletes stock if quantity is zero', async () => {
			const tx: TransactionItem = {
				symbol: 'MSFT',
				name: 'Microsoft Corp.',
				image: 'msft.png',
				type: 'stock',
				currency: 'USD',
				quantity: 5,
				price: 200,
				comission: 2,
				transactionType: 'buy',
				date: baseDate,
				source: 'nasdaq',
			};
			await store.init([tx]);
			store.removeTransaction(tx);
			expect(store.transactions).toHaveLength(0);
			expect(store.portfolio).toHaveLength(0); // stock removed
		});

		it('removes dividend-cash and subtracts from cashDividends', async () => {
			const tx: TransactionItem = {
				symbol: 'T',
				name: 'AT&T Inc.',
				image: 't.png',
				type: 'stock',
				currency: 'USD',
				quantity: 0,
				price: 50,
				comission: 0,
				transactionType: 'dividend-cash',
				date: baseDate,
			};
			await store.init([tx]);
			store.removeTransaction(tx);
			expect(store.cashDividends).toBe(0);
		});
	});

	describe('edge cases', () => {
		it('handles missing quote gracefully', async () => {
			vi.mock('@/stores/stocks', () => ({
				useStocksStore: () => ({
					getStockQuote: vi.fn().mockResolvedValue(null),
				}),
			}));

			const tx: TransactionItem = {
				symbol: 'ZZZ',
				name: 'Unknown Corp.',
				image: '',
				type: 'stock',
				currency: 'USD',
				quantity: 1,
				price: 1,
				comission: 0,
				transactionType: 'buy',
				date: baseDate,
				source: 'nasdaq',
			};
			await store.init([tx]);

			expect(store.portfolio[0].currentPrice).toBe(0);
		});

		it('alerts on dividend before stock creation', async () => {
			const dividend: TransactionItem = {
				symbol: 'NEW',
				name: 'New Corp.',
				image: '',
				type: 'stock',
				currency: 'USD',
				quantity: 1,
				price: 0,
				comission: 0,
				transactionType: 'dividend',
				date: baseDate,
				source: undefined,
			};
			await expect(() => store.init([dividend])).rejects.toThrow("A dividend was created before the stock was created, please create the stock first");
		});
	});

	describe('totalInvested', () => {
		it('returns 0 when portfolio is empty', () => {
			expect(store.totalInvested).toBe(0);
		});

		it('sums currentInvested and comission for positions with quantity > 0', async () => {
			const tx: TransactionItem = {
				symbol: 'AAPL',
				name: 'Apple Inc.',
				image: '',
				type: 'stock',
				currency: 'USD',
				quantity: 10,
				price: 100,
				comission: 10,
				transactionType: 'buy',
				date: baseDate,
				source: 'nasdaq',
			};
			await store.init([tx]);
			expect(store.totalInvested).toBe(1010); // 10 * 100 + 10
		});
	});

	describe('portfolioCurrentValue', () => {
		it('returns 0 when portfolio is empty', () => {
			expect(store.portfolioCurrentValue).toBe(0);
		});

		it('sums currentPrice * quantity for all positions with quantity > 0', () => {
			store.portfolio.push({
				symbol: 'MSFT',
				name: 'Microsoft Corp.',
				image: '',
				type: 'stock',
				currency: 'USD',
				quantity: 5,
				currentPrice: 300,
				manualInputedPrice: false,
				currentInvested: 1500,
				totalInvested: 1500,
				totalRetrieved: 0,
				comission: 0,
			});
			expect(store.portfolioCurrentValue).toBe(1500); // 5 * 300
		});
	});

	describe('closedPositions', () => {
		it('returns 0 when no positions are closed', () => {
			expect(store.closedPositions).toBe(0);
		});

		it('calculates profit/loss from fully closed positions', async () => {
			const buy: TransactionItem = {
				symbol: 'TSLA',
				name: 'Tesla Inc.',
				image: '',
				type: 'stock',
				currency: 'USD',
				quantity: 10,
				price: 100,
				comission: 0,
				transactionType: 'buy',
				date: baseDate,
				source: 'nasdaq',
			};
			const sell: TransactionItem = {
				...buy,
				transactionType: 'sell',
				price: 150,
				date: new Date().toISOString(),
			};
			await store.init([buy, sell]);
			expect(store.closedPositions).toBe(500); // 1500 - 1000
		});
	});

	describe('rentability', () => {
		it('returns 0 if totalInvested is 0', () => {
			expect(store.rentability).toBe(0);
		});

		it('calculates rentability with open, closed positions and cash dividends', async () => {
			const buy: TransactionItem = {
				symbol: 'NFLX',
				name: 'Netflix Inc.',
				image: '',
				type: 'stock',
				currency: 'USD',
				quantity: 10,
				price: 100,
				comission: 0,
				transactionType: 'buy',
				date: baseDate,
				source: 'nasdaq',
			};
			const sell: TransactionItem = {
				...buy,
				quantity: 5,
				price: 150,
				transactionType: 'sell',
				date: new Date().toISOString(),
			};
			const dividend: TransactionItem = {
				...buy,
				transactionType: 'dividend-cash',
				price: 100,
				quantity: 0,
				date: new Date().toISOString(),
			};
			await store.init([buy, sell, dividend]);

			const expected =
				((store.portfolioCurrentValue + store.closedPositions + store.cashDividends - store.totalInvested) /
					store.totalInvested) *
				100;

			expect(store.rentability).toBeCloseTo(expected, 2);
		});
	});

	describe('transferStock', () => {
		let portfolioStore: ReturnType<typeof usePortfolioStore>;

		beforeEach(() => {
			setActivePinia(createPinia());
			portfolioStore = usePortfolioStore();

			// Seed transactions
			portfolioStore.transactions = [
				{
					symbol: 'AAPL',
					name: 'Apple',
					source: 'nasdaq',
					type: 'stock',
					currency: 'USD',
					quantity: 10,
					price: 150,
					comission: 5,
					date: '2024-01-01',
					transactionType: 'buy',
					account: { name: 'accountA' },
				},
			];

			// Seed portfolios
			portfolioStore.portfolios = {
				default: [],
				all: [],
				accountA: [{
					symbol: 'AAPL',
					name: 'Apple',
					type: 'stock',
					currency: 'USD',
					quantity: 10,
					currentPrice: 150,
					manualInputedPrice: false,
					currentInvested: 1500,
					totalInvested: 1500,
					totalRetrieved: 0,
					comission: 5,
					sortedBuys: [{
						symbol: 'AAPL',
						name: 'Apple',
						source: 'nasdaq',
						type: 'stock',
						currency: 'USD',
						quantity: 10,
						price: 150,
						comission: 5,
						date: '2024-01-01',
						transactionType: 'buy',
						account: { name: 'accountA' },
					}],
					sortedSells: [],
					image: undefined,
				}],
				accountB: [],
			};
		});

		it('should transfer stock from one account to another', () => {
			portfolioStore.transferStock('AAPL', 'accountA', 'accountB');

			const accountA = portfolioStore.portfolios['accountA'];
			const accountB = portfolioStore.portfolios['accountB'];

			expect(accountA).toHaveLength(0);
			expect(accountB).toHaveLength(1);
			expect(accountB[0].symbol).toBe('AAPL');
			expect(accountB[0].quantity).toBe(10);

			// Verify transaction account updated
			expect(portfolioStore.transactions[0].account?.name).toBe('accountB');
		});

		it('should do nothing if fromAccount and toAccount are the same', () => {
			const snapshot = JSON.stringify(portfolioStore.portfolios);
			portfolioStore.transferStock('AAPL', 'accountA', 'accountA');
			expect(JSON.stringify(portfolioStore.portfolios)).toBe(snapshot);
		});

		it('should merge with existing symbol in destination portfolio', () => {
			portfolioStore['portfolios']['accountB'] = [{
				symbol: 'AAPL',
				name: 'Apple',
				type: 'stock',
				currency: 'USD',
				quantity: 5,
				currentPrice: 150,
				manualInputedPrice: false,
				currentInvested: 750,
				totalInvested: 750,
				totalRetrieved: 0,
				comission: 1,
				sortedBuys: [],
				sortedSells: [],
				image: undefined,
			}];

			portfolioStore.transferStock('AAPL', 'accountA', 'accountB');
			const accountB = portfolioStore.portfolios['accountB'];

			expect(accountB).toHaveLength(1);
			expect(accountB[0].quantity).toBe(15); // 10 from A + 5 existing
			expect(accountB[0].totalInvested).toBe(2250); // 1500 + 750
			expect(accountB[0].comission).toBe(6); // 5 + 1
			expect(accountB[0].sortedBuys.length).toBe(1);
		});
	});
});
