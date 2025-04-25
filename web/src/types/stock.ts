export interface StockSymbol {
	symbol: string;
	name: string;
	type: string;
	isin?: string;
	currency: string;
	region: string;
	source: string;
}

export type StockSymbolForDisplay = StockSymbol & {
	hideImage: boolean | undefined;
	isFavorite: boolean | undefined;
	price: number | undefined;
	openPrice: number | undefined;
};

export interface StockQuote {
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
