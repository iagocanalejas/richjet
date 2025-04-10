import type { FinnhubStockSymbolForDisplay, TransactionItem } from "./finnhub";

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
    watchlist: FinnhubStockSymbolForDisplay[];
}
