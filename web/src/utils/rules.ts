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

export function isDividend(type: TransactionType): boolean {
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

export function hasBoughtSharesIfNeeded(transaction: TransactionItem, transactions: TransactionItem[]): boolean {
    return (
        !isDividend(transaction.transaction_type) ||
        transactions.some((t) => t.transaction_type === 'BUY' && t.symbol === transaction.symbol)
    );
}
