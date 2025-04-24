import { setActivePinia, createPinia, StoreDefinition } from 'pinia';
import { describe, it, beforeEach, expect, vi } from 'vitest';
import { usePortfolioStore } from '../../src/stores/portfolio';
import { ref } from 'vue';

vi.mock('@/stores/google', () => ({
	useGoogleStore: () => ({
		syncData: vi.fn(),
	}),
}));

vi.mock('@/stores/settings', () => {
	return {
		useSettingsStore: () => ({ conversionRate: ref(1) }),
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
			const tx = {
				symbol: 'AAPL',
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
				quantity: 5,
				currentInvested: 500,
				totalInverted: 500,
				comission: 1,
			});
		});
	});

	describe('sell transaction', () => {
		it('subtracts from quantity and adds to retrieved', async () => {
			const buy = {
				symbol: 'AAPL',
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
			const sell = {
				...buy,
				quantity: 4,
				price: 110,
				transactionType: 'sell',
				comission: 2,
			};
			await store.init([buy, sell]);

			expect(store.portfolio[0].quantity).toBe(6);
			expect(store.portfolio[0].totalRetrieved).toBe(440); // 4 * 110
			expect(store.portfolio[0].comission).toBe(3); // 1 + 2
		});
	});

	describe('dividend transaction', () => {
		it('adds to quantity only', async () => {
			const buy = {
				symbol: 'T',
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
			const dividend = {
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
			const cashDividend = {
				symbol: 'T',
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
			const tx = {
				symbol: 'MSFT',
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
			const tx = {
				symbol: 'T',
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

			const tx = {
				symbol: 'ZZZ',
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
			const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => { });
			const dividend = {
				symbol: 'NEW',
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
			await store.init([dividend]);
			expect(alertSpy).toHaveBeenCalled();
			alertSpy.mockRestore();
		});
	});
});
