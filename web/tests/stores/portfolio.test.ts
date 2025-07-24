import { setActivePinia, createPinia } from 'pinia';
import { describe, it, beforeEach, expect, vi } from 'vitest';
import { usePortfolioStore } from '../../src/stores/portfolio';
import { type TransactionItem } from '../../src/types/portfolio';
import { ref } from 'vue';
import { StockSymbol } from '../../src/types/stock';
import { hasBoughtSharesIfNeeded } from '../../src/utils/rules';

let getStockQuoteMock = vi.fn(() => Promise.resolve({ current: 100 }));
vi.mock('@/stores/stocks', () => ({
    useStocksStore: () => ({
        getStockQuote: () => getStockQuoteMock(),
    }),
}));

vi.mock('@/stores/settings', () => ({
    useSettingsStore: () => ({
        conversionRate: ref(1),
        account: ref({ id: '1', name: 'default' }),
        accounts: ref([
            { id: '1', name: 'default' },
            { id: '2', name: 'brokerage' },
        ]),
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

vi.mock('@/utils/rules', () => ({
    hasBoughtSharesIfNeeded: vi.fn(),
    isSavingsAccount: vi.fn(),
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

async function mockTransaction(store: ReturnType<typeof usePortfolioStore>, overrides = {}) {
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
    const store = usePortfolioStore();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => [] }));
    await store.init();
    return store;
}

describe('usePortfolioStore', () => {
    let store: ReturnType<typeof usePortfolioStore>;
    const baseDate = new Date().toISOString();

    beforeEach(async () => {
        setActivePinia(createPinia());
        store = await mockEmptyStore();

        getStockQuoteMock = vi.fn(() => Promise.resolve({ current: 100 }));
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
        const store = usePortfolioStore();
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => [tx] }));
        await store.init();
        expect(store.transactions.length).toBe(1);
        expect(store.portfolios.default.length).toBe(1);
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
        expect(store.portfolios.default.length).toBe(1);
    });

    describe('transactions', () => {
        it('buys', async () => {
            const tx = await mockTransaction(store);
            expect(store.transactions[0]).toEqual(tx);
            expect(store.portfolios.default[0].quantity).toBe(10);
            expect(store.portfolios.default[0].totalRetrieved).toBe(0);
            expect(store.portfolios.default[0].currentInvested).toBe(1500);
            expect(store.portfolios.default[0].commission).toBe(1);
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
            expect(store.portfolios.default[0].quantity).toBe(5);
            expect(store.portfolios.default[0].totalRetrieved).toBe(1000);
            expect(store.portfolios.default[0].currentInvested).toBe(750);
            expect(store.portfolios.default[0].commission).toBe(3);
        });

        it('applies FIFO logic when selling shares from multiple buys', async () => {
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
                quantity: 5,
                price: 300,
                date: new Date(Date.now() + 1000).toISOString(), // later than buy1
            });

            await mockTransaction(store, {
                ...buy1,
                id: 3,
                quantity: 7,
                price: 400,
                commission: 5,
                transaction_type: 'SELL',
                date: new Date(Date.now() + 2000).toISOString(),
            });

            const position = store.portfolios.default[0];
            expect(position.quantity).toBe(3);
            expect(position.totalRetrieved).toBe(2800);
            expect(position.totalInvested).toBe(2500);
            expect(position.currentInvested).toBe(900);
            expect(position.commission).toBe(5);
            expect(position.sortedSells).toHaveLength(1);
            expect(position.sortedSells[0].costBasis).toBe(5 * 200 + 2 * 300);
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
            expect(store.portfolios.default[0].quantity).toBe(7); // 5 from buy + 2 from dividend
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
        it('removes a buy transaction and deletes stock if quantity is zero', async () => {
            const tx = await mockTransaction(store);
            vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
            await store.removeTransaction(tx);
            expect(store.transactions.length).toBe(0);
            expect(store.portfolios.default.length).toBe(0);
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

    describe('edge cases', () => {
        it('handles missing quote gracefully', async () => {
            getStockQuoteMock = vi.fn().mockResolvedValue(null);
            await mockTransaction(store, {
                symbol: { ...mockSymbol, ticker: 'ZZZ', name: 'Unknown Corp.' },
                currency: 'USD',
                quantity: 1,
                price: 1,
                commission: 0,
                date: baseDate,
            });

            expect(store.portfolio[0].currentPrice).toBe(0);
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
            expect(store.portfolios.brokerage[0].symbol.ticker).toBe('AAPL');
            expect(store.portfolios.default.length).toBe(0);
        });

        it('should not transfer stock if fromAccount and toAccount are the same', async () => {
            await mockTransaction(store, {
                symbol: { ...mockSymbol, ticker: 'AAPL' },
                account: { id: '1', name: 'default' },
            });
            await store.transferStock('AAPL', '1', '1');
            expect(store.portfolios.default.length).toBe(1);
            expect(store.portfolios.default[0].symbol.ticker).toBe('AAPL');
        });

        it('merges with existing stock in destination account', async () => {
            store.portfolios['brokerage'] = [];
            const tx = await mockTransaction(store, {
                symbol: { ...mockSymbol, ticker: 'AAPL' },
                account: { id: '1', name: 'default' },
            });
            await mockTransaction(store, {
                symbol: { ...mockSymbol, ticker: 'AAPL' },
                account: { id: '2', name: 'brokerage' },
            });
            vi.stubGlobal(
                'fetch',
                vi.fn().mockResolvedValue({
                    ok: true,
                    json: async () => [tx.id],
                })
            );
            await store.transferStock('AAPL', '1', '2');
            expect(store.portfolios.brokerage[0].quantity).toBe(20);
            expect(store.portfolios.brokerage[0].totalInvested).toBe(3000);
            expect(store.portfolios.brokerage[0].commission).toBe(2);
        });
    });

    describe('manual price updates', () => {
        it('updates manual price', async () => {
            await mockTransaction(store);
            await store.updateManualPrice(mockSymbol.id, 200);
            expect(store.portfolios.default[0].currentPrice).toBe(200);
        });
    });

    describe('totalInvested', () => {
        it('returns 0 when portfolio is empty', () => {
            expect(usePortfolioStore().totalInvested).toBe(0);
        });

        it('sums currentInvested and commission for positions with quantity > 0', async () => {
            await mockTransaction(store, {
                id: '1',
                user_id: '1',
                symbol: {
                    id: '1',
                    name: 'Apple Inc.',
                    picture: '',
                    security_type: 'STOCK',
                    ticker: 'AAPL',
                    currency: 'USD',
                    source: 'nasdaq',
                },
                currency: 'USD',
                quantity: 10,
                price: 100,
                commission: 10,
                transaction_type: 'BUY',
                date: baseDate,
            });
            expect(store.totalInvested).toBe(1010); // 10 * 100 + 10
        });
    });

    describe('portfolioCurrentValue', () => {
        it('returns 0 when portfolio is empty', () => {
            expect(usePortfolioStore().portfolioCurrentValue).toBe(0);
        });

        it('sums currentPrice * quantity for all positions with quantity > 0', async () => {
            store.portfolio.push({
                symbol: {
                    id: '1',
                    ticker: 'MSFT',
                    name: 'Microsoft Corp.',
                    image: '',
                    currency: 'USD',
                    source: 'nasdaq',
                    security_type: 'STOCK',
                },
                quantity: 5,
                currentPrice: 300,
                currentInvested: 1500,
                totalInvested: 1500,
                totalRetrieved: 0,
                commission: 0,
            });
            expect(store.portfolioCurrentValue).toBe(1500); // 5 * 300
        });
    });

    describe('closedPositions', () => {
        it('returns 0 when no positions are closed', () => {
            expect(usePortfolioStore().closedPositions).toBe(0);
        });

        it('calculates profit/loss from fully closed positions', async () => {
            const buy = await mockTransaction(store, {
                id: '1',
                user_id: '1',
                symbol: {
                    id: '1',
                    ticker: 'TSLA',
                    name: 'Tesla Inc.',
                    picture: '',
                    security_type: 'STOCK',
                    currency: 'USD',
                    source: 'nasdaq',
                },
                currency: 'USD',
                quantity: 10,
                price: 100,
                commission: 0,
                transaction_type: 'BUY',
                date: baseDate,
            });
            await mockTransaction(store, {
                ...buy,
                id: '2',
                transaction_type: 'SELL',
                price: 150,
                date: new Date().toISOString(),
            });
            expect(store.closedPositions).toBe(500); // 1500 - 1000
        });
    });

    describe('rentability', () => {
        it('returns 0 if totalInvested is 0', () => {
            expect(usePortfolioStore().rentability).toBe(0);
        });

        it('calculates rentability with open, closed positions and cash dividends', async () => {
            const buy = await mockTransaction(store, {
                id: '1',
                user_id: '1',
                symbol: {
                    id: '1',
                    ticker: 'NFLX',
                    name: 'Netflix Inc.',
                    picture: '',
                    security_type: 'STOCK',
                    currency: 'USD',
                    source: 'nasdaq',
                },
                currency: 'USD',
                quantity: 10,
                price: 100,
                commission: 0,
                transaction_type: 'BUY',
                date: baseDate,
            });
            await mockTransaction(store, {
                ...buy,
                id: '2',
                quantity: 5,
                price: 150,
                transaction_type: 'SELL',
                date: new Date().toISOString(),
            });
            await mockTransaction(store, {
                ...buy,
                id: '3',
                IDBTransactiontion_type: 'DIVIDEND-CASH',
                price: 100,
                quantity: 0,
                date: new Date().toISOString(),
            });

            const expected =
                ((store.portfolioCurrentValue + store.closedPositions + store.cashDividends - store.totalInvested) /
                    store.totalInvested) *
                100;

            expect(store.rentability).toBeCloseTo(expected, 2);
        });
    });
});
