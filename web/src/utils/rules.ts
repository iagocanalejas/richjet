import type { PortfolioItem, TransactionType } from '@/types/portfolio';

export function isDividend(type: TransactionType): boolean {
    return type === 'DIVIDEND' || type === 'DIVIDEND-CASH';
}

export function isTradePortfolioItem(item: PortfolioItem): boolean {
    return item.quantity === 0;
}

export function isPortfolioItemWithManualPrice(item: PortfolioItem): boolean {
    return item.manualInputedPrice || item.currentPrice === 0;
}
