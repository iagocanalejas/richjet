import type { TransactionItem } from "./portfolio";
import type { StockSymbolForDisplay } from "./stock";

export interface GoogleUser {
	name: string;
	givenName: string;
	familyName: string;
	email: string;
	picture: string;
}

export type Account = {
	name: string;
	type: "broker" | "bank";
}

export type Settings = {
	currency: string;
	accounts: Account[];
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
