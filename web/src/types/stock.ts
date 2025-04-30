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
};

export interface StockQuote {
	symbol: string;
	current: number;
	high: number;
	low: number;
	open: number;
	previpus_close: number;
}

export interface TransactionItem {
	symbol: string;
	image: string;
	quantity: number;
	price: number;
	currency: string;
	comission: number;
	type: string;
	date: string;
	source?: string;
	transactionType: "buy" | "sell" | "dividend" | "dividend-cash";
}

export interface PortfolioItem {
	symbol: string;
	image: string;
	type: string;
	currency: string;
	quantity: number;
	currentPrice: number;
	manualInputedPrice: boolean;
	currentInvested: number;
	totalInverted: number;
	totalRetrieved: number;
	comission: number;
}

export function symbolType2Image(from: string) {
	switch (from.toUpperCase()) {
		case "STOCK":
		case "ETP":
		case "GDR":
			return "symbol";
		case "CRYPTO":
			return "crypto";
		default:
			console.error("Unknown symbol type", from);
			break;
	}
}
