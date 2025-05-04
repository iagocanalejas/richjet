export type TransactionType = "buy" | "sell" | "dividend" | "dividend-cash";
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
	transactionType: TransactionType;
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
	totalInvested: number;
	totalRetrieved: number;
	comission: number;
}
