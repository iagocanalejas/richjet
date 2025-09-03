import type { PortfolioItem, TransactionItem, TransactionType } from '@/types/portfolio';
import type { Account } from '@/types/user';

export function isLite(plan: string): boolean {
    return plan.toUpperCase().includes('LITE');
}

export function isPro(plan: string): boolean {
    return plan.toUpperCase().includes('PRO');
}

export function isMax(plan: string): boolean {
    return plan.toUpperCase().includes('MAX');
}

export function isBuy(t: TransactionItem | TransactionType): boolean {
    const type = typeof t === 'string' ? t : t.transaction_type;
    return type === 'BUY';
}

export function isSell(t: TransactionItem | TransactionType): boolean {
    const type = typeof t === 'string' ? t : t.transaction_type;
    return type === 'SELL';
}

export function isDividend(t: TransactionItem | TransactionType): boolean {
    const type = typeof t === 'string' ? t : t.transaction_type;
    return type === 'DIVIDEND' || type === 'DIVIDEND-CASH';
}

export function isTradePortfolioItem(item: PortfolioItem): boolean {
    return item.quantity === 0;
}

export function isPortfolioItemWithManualPrice(item: PortfolioItem): boolean {
    return !!item.symbol.manual_price || item.currentPrice === 0;
}

export function isSavingsAccount(account?: Account): boolean {
    return account?.account_type === 'BANK';
}

export function accountCanHaveShares(account?: Account): boolean {
    return !account || account.account_type === 'BROKER';
}

export function hasSameAccount(t1: TransactionItem, t2: TransactionItem): boolean {
    return (
        t1.account?.id === t2.account?.id ||
        t1.account_id === t2.symbol_id ||
        t1.account?.id === t2.account_id ||
        t1.account_id === t2.account?.id
    );
}

export function hasBoughtSharesIfNeeded(transaction: TransactionItem, transactions: TransactionItem[]): boolean {
    if (isBuy(transaction)) return true; // no need to check buy transactions
    return transactions.some((t) => isBuy(t) && t.symbol === transaction.symbol && hasSameAccount(transaction, t));
}
