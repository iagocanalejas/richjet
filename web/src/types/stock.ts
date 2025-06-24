export const SecurityTypes = ['STOCK', 'ETP', 'INDEX', 'GDR', 'CRYPTO', 'BOND'] as const;
export type SecurityType = (typeof SecurityTypes)[number];

export const MarketSectors = [
    'COMMODITY',
    'CORPORATE',
    'CURRENCY',
    'EQUITY',
    'GOVERNMENT',
    'INDEX',
    'MONEY_MARKET',
    'MORTGAGE',
    'MUNICIPAL',
    'PREFERRED',
] as const;
export type MarketSector = (typeof MarketSectors)[number];

export interface StockSymbol {
    id: string;
    ticker: string;
    name: string;
    currency: string;
    source: string;
    security_type: SecurityType;
    picture?: string;
    market_sector?: MarketSector;
    isin?: string;
    figi?: string;
    manual_price?: number;
}

export type StockSymbolForDisplay = StockSymbol & {
    isFavorite: boolean | undefined;
    price: number | undefined;
    openPrice: number | undefined;
    noPrice: boolean | undefined;
};

export interface StockQuote {
    symbol: string;
    current: number;
    high: number;
    low: number;
    open: number;
    previpus_close: number;
}
