import { setActivePinia, createPinia } from 'pinia';
import { describe, it, beforeEach, expect, vi } from 'vitest';
import { useTransactionsStore } from '../../src/stores/transactions';
import { type TransactionItem } from '../../src/types/portfolio';
import { ref } from 'vue';
import { StockSymbol } from '../../src/types/stock';
import { hasBoughtSharesIfNeeded } from '../../src/utils/rules';

const getStockQuoteMock = vi.fn(() => Promise.resolve({ current: 100 }));
vi.mock('@/stores/stocks', () => ({
    useStocksStore: () => ({
        getStockQuote: () => getStockQuoteMock(),
    }),
}));

vi.mock('@/stores/settings', () => ({
    useSettingsStore: () => ({
        conversionRate: ref(1),
        account: ref(undefined),
        accounts: ref([
            { id: '1', name: 'default' },
            { id: '2', name: 'brokerage' },
        ]),
    }),
}));

vi.mock('@/utils/rules', () => ({
    hasBoughtSharesIfNeeded: vi.fn(),
}));

const mockSymbol: StockSymbol = {
    id: '1',
    ticker: 'AAPL',
    name: 'Apple',
    currency: 'USD',
    source: 'NASDAQ',
    security_type: 'STOCK',
    is_user_created: false,
};

async function mockTransaction(store: ReturnType<typeof useTransactionsStore>, overrides = {}) {
    const tx: TransactionItem = {
        id: '1',
        user_id: '1',
        symbol: { ...mockSymbol },
        quantity: 10,
        price: 150,
        commission: 1,
        currency: 'USD',
        transaction_type: 'BUY',
        date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        ...overrides,
    };

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => tx }));

    const original = vi.mocked(hasBoughtSharesIfNeeded);
    original.mockReturnValue(true);
    await store.addTransaction(tx);
    original.mockReset();
    return tx;
}

async function mockEmptyStore() {
    const store = useTransactionsStore();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => [] }));
    await store.init();
    return store;
}

describe('useTransactionsStore', () => {
    let store: ReturnType<typeof useTransactionsStore>;
    const baseDate = new Date().toISOString();

    beforeEach(async () => {
        setActivePinia(createPinia());
        store = await mockEmptyStore();
    });

    it('initializes store with a buy transaction', async () => {
        const tx: TransactionItem = {
            id: '1',
            user_id: '1',
            symbol: mockSymbol,
            quantity: 10,
            price: 150,
            commission: 1,
            currency: 'USD',
            transaction_type: 'BUY',
            date: '2023-01-01',
        };
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => [tx] }));
        await store.init();
        expect(store.transactions.length).toBe(1);
    });

    it('initializes store with buy and sell transaction', async () => {
        const tx1: TransactionItem = {
            id: '1',
            user_id: '1',
            symbol: mockSymbol,
            quantity: 10,
            price: 150,
            commission: 1,
            currency: 'USD',
            transaction_type: 'BUY',
            date: '2023-01-01',
        };
        const tx2: TransactionItem = {
            id: '2',
            user_id: '1',
            symbol: mockSymbol,
            quantity: 5,
            price: 200,
            commission: 2,
            currency: 'USD',
            transaction_type: 'SELL',
            date: '2023-01-02',
        };
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => [tx1, tx2] }));
        await store.init();
        expect(store.transactions.length).toBe(2);
    });

    describe('transactions', () => {
        it('buys', async () => {
            const tx = await mockTransaction(store);
            expect(store.transactions[0]).toEqual(tx);
        });

        it('sells', async () => {
            const buyTx = await mockTransaction(store);
            await mockTransaction(store, {
                ...buyTx,
                id: 2,
                transaction_type: 'SELL',
                quantity: 5,
                price: 200,
                commission: 2,
                date: new Date().toISOString(),
            });

            expect(store.transactions.length).toBe(2);
        });

        it('adds a dividend', async () => {
            const buy1 = await mockTransaction(store, {
                id: 1,
                user_id: 1,
                symbol: { ...mockSymbol, ticker: 'GOOG', name: 'Alphabet Inc.' },
                quantity: 5,
                price: 200,
                commission: 0,
                currency: 'USD',
                transaction_type: 'BUY',
                date: baseDate,
            });

            await mockTransaction(store, {
                ...buy1,
                id: 2,
                quantity: 2,
                price: 0,
                transaction_type: 'DIVIDEND',
                date: new Date(Date.now() + 1000).toISOString(), // later than buy1
            });

            expect(store.transactions.length).toBe(2);
        });

        it('tries to add a dividend before stock creation', async () => {
            const dividendTx: TransactionItem = {
                id: '1',
                user_id: '1',
                symbol: { ...mockSymbol, ticker: 'NEW', name: 'New Corp.' },
                quantity: 1,
                price: 0,
                commission: 0,
                currency: 'USD',
                transaction_type: 'DIVIDEND',
                date: baseDate,
            };

            expect(await store.addTransaction(dividendTx)).toBe(undefined);
        });

        it('adds a cash dividend', async () => {
            const buy1 = await mockTransaction(store, {
                id: '1',
                user_id: '1',
                symbol: { ...mockSymbol, ticker: 'GOOG', name: 'Alphabet Inc.' },
                quantity: 5,
                price: 200,
                commission: 0,
                currency: 'USD',
                transaction_type: 'BUY',
                date: baseDate,
            });

            await mockTransaction(store, {
                ...buy1,
                id: '2',
                quantity: 0,
                price: 100,
                commission: 0,
                transaction_type: 'DIVIDEND-CASH',
                date: new Date(Date.now() + 1000).toISOString(), // later than buy1
            });

            expect(store.cashDividends).toBe(100);
        });
    });

    describe('removal', () => {
        it('removes a buy transaction', async () => {
            const tx = await mockTransaction(store);
            vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
            await store.removeTransaction(tx);
            expect(store.transactions.length).toBe(0);
        });

        it('removes a dividend-cash transaction and updates cashDividends', async () => {
            const buyTx = await mockTransaction(store);
            const divTx = await mockTransaction(store, {
                ...buyTx,
                id: '2',
                quantity: 0,
                price: 100,
                commission: 0,
                transaction_type: 'DIVIDEND-CASH',
                date: new Date().toISOString(),
            });
            expect(store.cashDividends).toBe(100);

            vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
            await store.removeTransaction(divTx);
            expect(store.cashDividends).toBe(0);
        });
    });

    describe('stock transfer', () => {
        it('transfers a stock between accounts', async () => {
            const tx = await mockTransaction(store, {
                symbol: { ...mockSymbol, ticker: 'AAPL' },
                account: { id: '1', name: 'default' },
            });
            vi.stubGlobal(
                'fetch',
                vi.fn().mockResolvedValue({
                    ok: true,
                    json: async () => [tx.id],
                })
            );
            await store.transferStock('AAPL', '1', '2');
            expect(store.transactions[0].account.id).toBe('2');
        });

        it('should not transfer stock if fromAccount and toAccount are the same', async () => {
            await mockTransaction(store, {
                symbol: { ...mockSymbol, ticker: 'AAPL' },
                account: { id: '1', name: 'default' },
            });
            await store.transferStock('AAPL', '1', '1');
            expect(store.transactions[0].account.id).toBe('1');
        });
    });

    describe('manual price updates', () => {
        it('updates manual price for a stock', async () => {
            const tx = await mockTransaction(store, {
                symbol: { ...mockSymbol, ticker: 'AAPL' },
            });
            const newPrice = 200;

            vi.stubGlobal(
                'fetch',
                vi.fn().mockResolvedValue({
                    ok: true,
                    json: async () => ({ ...tx, symbol: { ...tx.symbol, manual_price: newPrice } }),
                })
            );
            await store.updateManualPrice(tx.symbol.id, newPrice);
            expect(store.transactions[0].symbol.manual_price).toBe(newPrice);
        });
    });
});
