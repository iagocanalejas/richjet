import { setActivePinia, createPinia } from 'pinia';
import { describe, it, beforeEach, expect, vi } from 'vitest';
import { usePortfolioStore } from '../../src/stores/portfolio';
import { type TransactionItem } from '../../src/types/portfolio';
import { ref } from 'vue';
import { StockSymbol } from '../../src/types/stock';
import { Account } from '../../src/types/user';

const MOCK_CURRENT_PRICE = 200;
const getStockQuoteMockSync = vi.fn(() => ({ current: MOCK_CURRENT_PRICE }));
vi.mock('@/stores/stocks', () => ({
    useStocksStore: () => ({
        getStockQuoteSync: () => getStockQuoteMockSync(),
    }),
}));

const mockTransactions = ref<TransactionItem[]>([]);
const mockCashDividends = ref(0);
vi.mock('@/stores/transactions', () => ({
    useTransactionsStore: () => ({
        transactions: mockTransactions,
        cashDividends: mockCashDividends,
    }),
}));

const mockAccount = ref<Account | undefined>(undefined);
const mockAccounts = ref<Account[]>([]);
vi.mock('@/stores/settings', () => ({
    useSettingsStore: () => ({
        conversionRate: ref(1),
        account: mockAccount,
        accounts: mockAccounts,
    }),
}));

vi.mock('@/stores/watchlist', () => {
    return {
        useWatchlistStore: () => ({
            updateSymbolManualPrice: vi.fn((symbol_id, price) =>
                Promise.resolve({ ...mockSymbol, id: symbol_id, manual_price: price })
            ),
        }),
    };
});

const mockSymbol: StockSymbol = {
    id: '1',
    ticker: 'AAPL',
    display_name: 'APPLE',
    name: 'Apple',
    currency: 'USD',
    source: 'NASDAQ',
    security_type: 'STOCK',
    is_user_created: false,
};

const createTransaction = (overrides: Partial<TransactionItem>): TransactionItem => ({
    id: Math.random().toString(),
    user_id: 'user-1',
    symbol: { ...mockSymbol },
    quantity: 1,
    price: 100,
    commission: 1,
    currency: 'USD',
    transaction_type: 'BUY',
    date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    ...overrides,
});

describe('usePortfolioStore', () => {
    let store: ReturnType<typeof usePortfolioStore>;

    beforeEach(async () => {
        setActivePinia(createPinia());

        mockTransactions.value = [];
        mockCashDividends.value = 0;
        mockAccount.value = undefined;
        mockAccounts.value = [];
        store = usePortfolioStore();
    });

    it('should calculate a single BUY transaction correctly', async () => {
        mockTransactions.value = [createTransaction({ quantity: 10, price: 50 })];

        expect(store.portfolio).toHaveLength(1);
        const item = store.portfolio[0];

        expect(item.quantity).toBe(10);
        expect(item.totalInvested).toBe(500);
        expect(item.commission).toBe(1);
        expect(item.currentPrice).toBe(200);
    });

    it('should aggregate multiple BUY transactions', () => {
        mockTransactions.value = [
            createTransaction({ quantity: 10, price: 50 }),
            createTransaction({ quantity: 5, price: 100 }),
        ];

        expect(store.portfolio).toHaveLength(1);
        const item = store.portfolio[0];

        expect(item.quantity).toBe(15);
        expect(item.totalInvested).toBe(1000);
    });

    it('should handle SELL transactions using FIFO', () => {
        mockTransactions.value = [
            createTransaction({ transaction_type: 'SELL', quantity: 4, price: 200 }),
            createTransaction({ quantity: 3, price: 150 }),
            createTransaction({ quantity: 5, price: 100 }),
        ];

        expect(store.portfolio).toHaveLength(1);
        const item = store.portfolio[0];

        expect(item.quantity).toBe(4);
        expect(item.sortedSells).toHaveLength(1);
        expect(item.sortedSells[0].costBasis).toBe(400);
    });

    it('should increase quantity on DIVIDEND transaction', () => {
        mockTransactions.value = [
            createTransaction({ transaction_type: 'DIVIDEND', quantity: 2 }),
            createTransaction({ quantity: 5, price: 100 }),
        ];

        expect(store.portfolio).toHaveLength(1);
        const item = store.portfolio[0];

        expect(item.quantity).toBe(7);
    });

    it('should ignore quantity change for DIVIDEND-CASH', () => {
        mockTransactions.value = [
            createTransaction({ transaction_type: 'DIVIDEND-CASH', quantity: 99 }),
            createTransaction({ quantity: 5, price: 100 }),
        ];

        expect(store.portfolio).toHaveLength(1);
        const item = store.portfolio[0];

        expect(item.quantity).toBe(5);
    });

    describe('properties', () => {
        it('should calculate savingAccountsValue', () => {
            const newAccount = { id: '3', name: 'savings', balance: 1000, account_type: 'BANK' } as Account;
            mockAccounts.value.push(newAccount);
            mockAccount.value = newAccount;

            expect(store.savingAccountsValue).toBe(1000);
        });

        it('should include savings value in portfolioCurrentValue', () => {
            mockTransactions.value = [createTransaction({ quantity: 10, price: 50 })];
            mockAccounts.value.push({ id: 'acc-2', name: 'savings', balance: 50, account_type: 'BANK' } as Account);

            expect(store.portfolio).toHaveLength(1);
            expect(store.portfolioCurrentValue).toBe(10 * MOCK_CURRENT_PRICE + 50);
        });

        it('should calculate closedPositions after sell', () => {
            mockTransactions.value = [
                createTransaction({ transaction_type: 'SELL', quantity: 5, price: 150 }),
                createTransaction({ quantity: 5, price: 100 }),
            ];

            expect(store.portfolio).toHaveLength(1);
            expect(store.closedPositions).toBe(248);
        });

        it('should calculate rentability including dividends and closed positions', () => {
            mockTransactions.value = [createTransaction({ quantity: 5, price: 100 })];
            mockCashDividends.value = 50;

            expect(store.portfolio).toHaveLength(1);
            expect(store.rentability).toBeGreaterThan(109);
        });

        it('should filter transactions by selected account', () => {
            const account2 = { id: 'acc-2', name: 'other', balance: 0, account_type: 'BROKER' } as Account;
            mockTransactions.value = [
                createTransaction({ quantity: 5, account: { id: 'acc-1', name: 'main', balance: 0 } as Account }),
                createTransaction({ quantity: 5, account: account2 }),
            ];

            expect(store.portfolio[0].quantity).toBe(10);

            mockAccount.value = account2;
            expect(store.portfolio[0].quantity).toBe(5);
        });
    });
});
