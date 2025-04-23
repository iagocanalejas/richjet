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
}
