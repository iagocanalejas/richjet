export type SecurityType = 'STOCK' | 'ETP' | 'EQUITY_INDEX' | 'COMMODITY_INDEX' | 'GDR' | 'CRYPTO' | 'BOND';

export type MarketSector =
    | 'COMMODITY'
    | 'CORPORATE'
    | 'CURRENCY'
    | 'EQUITY'
    | 'GOVERNMENT'
    | 'INDEX'
    | 'MONEY_MARKET'
    | 'MORTGAGE'
    | 'MUNICIPAL'
    | 'PREFERRED';

export interface StockSymbol {
    id: number;
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
    hideImage: boolean | undefined;
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
