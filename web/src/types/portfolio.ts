import type { Account } from './user';
import type { StockSymbol } from './stock';

export type TransactionType = 'BUY' | 'SELL' | 'DIVIDEND' | 'DIVIDEND-CASH';
export interface TransactionItem {
    id: string;
    user_id: string;
    symbol: StockSymbol;
    account?: Account;
    quantity: number;
    price: number;
    commission: number;
    currency: string;
    transaction_type: TransactionType;
    date: string;
    symbol_id?: string;
    account_id?: string;
}

export interface PortfolioItem {
    symbol: StockSymbol;
    currency: string;
    quantity: number;
    currentPrice: number;
    manualInputedPrice: boolean;
    currentInvested: number;
    totalInvested: number;
    totalRetrieved: number;
    commission: number;

    // should be use only for portfolio calculation
    sortedBuys: TransactionItem[];
    sortedSells: (TransactionItem & { costBasis: number })[];
}
