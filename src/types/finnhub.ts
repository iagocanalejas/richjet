export interface FinnhubStockSymbol {
    currency: string;
    description: string;
    displaySymbol: string;
    symbol: string;
    symbol2: string;
    type: string;
}

export type FinnhubStockSymbolForDisplay = FinnhubStockSymbol & {
    hideImage: boolean | undefined;
    isFavorite: boolean | undefined;
};

export interface FinnhubStockQuote {
    c: number; // current price
    h: number; // high price
    l: number; // low price
    o: number; // open price
    pc: number; // previous close price
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
    transactionType: "buy" | "sell";
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
        case "COMMON STOCK":
            return "symbol";
        case "CRYPTO":
            return "crypto";
        default:
            break;
    }
}
