import type { PortfolioItem, TransactionItem, TransactionType } from '@/types/portfolio';

export function isDividend(type: TransactionType): boolean {
    return type === 'DIVIDEND' || type === 'DIVIDEND-CASH';
}

export function isTradePortfolioItem(item: PortfolioItem): boolean {
    return item.quantity === 0;
}

export function isPortfolioItemWithManualPrice(item: PortfolioItem): boolean {
    return item.currentPrice === 0;
}

export function hasBoughtSharesIfNeeded(transaction: TransactionItem, transactions: TransactionItem[]): boolean {
    return (
        isDividend(transaction.transaction_type) &&
        transactions.some((t) => t.transaction_type === 'BUY' && t.symbol === transaction.symbol)
    );
}

export function isValidISIN(isin: string): boolean {
    if (!/^[A-Z]{2}[A-Z0-9]{9}[0-9]$/.test(isin)) return false;

    // Convert letters to numbers (A = 10, B = 11, ..., Z = 35)
    const converted = isin
        .slice(0, -1)
        .split('')
        .map((char) => (/[A-Z]/.test(char) ? (char.charCodeAt(0) - 55).toString() : char))
        .join('');

    // Append check digit
    const full = converted + isin.slice(-1);

    // Apply Luhn algorithm
    let sum = 0;
    let double = false;

    for (let i = full.length - 1; i >= 0; i--) {
        let digit = parseInt(full[i], 10);
        if (double) {
            digit *= 2;
            if (digit > 9) digit -= 9;
        }
        sum += digit;
        double = !double;
    }

    return sum % 10 === 0;
}
