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
