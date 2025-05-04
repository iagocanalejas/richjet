export type SecurityType = 'STOCK' | 'ETP' | 'EQUITY_INDEX' | 'COMMODITY_INDEX' | 'GDR' | 'CRYPTO' | 'BOND';
export type MarketSector = 'COMMODITY' | 'CORPORATE' | 'CURRENCY' | 'EQUITY' | 'GOVERNMENT' | 'INDEX' | 'MONEY_MARKET' | 'MORTGAGE' | 'MUNICIPAL' | 'PREFERRED';
export interface StockSymbol {
	symbol: string;
	name: string;
	security_type: SecurityType;
	currency: string;
	source: string;
	region?: string;
	market_sector?: MarketSector;
	isin?: string;
	figi?: string;
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
