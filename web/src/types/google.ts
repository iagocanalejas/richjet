import type { StockSymbolForDisplay, TransactionItem } from "./stock";

export interface GoogleUser {
	name: string;
	givenName: string;
	familyName: string;
	email: string;
	picture: string;
}

export type Settings = {
	currency: string;
};

export interface FileData {
	version: number;
	settings: Settings;
	transactions: TransactionItem[];
	watchlist: StockSymbolForDisplay[];
	manualPrices: { [k: string]: number };
}

export interface FileMetadata {
	name: string;
	mimeType: string;
	parents?: string[]
}

export type TokenClient = google.accounts.oauth2.TokenClient
	& { callback: (tokenResponse: google.accounts.oauth2.TokenResponse) => Promise<void> };
