export interface StockSymbol {
    id: string;
    ticker: string;
    display_name: string;
    name: string;
    source: string;
    currency: string;
    isin?: string;
    picture?: string;
    price?: number;
    open_price?: number;
    is_user_created: boolean;
    is_manual_price: boolean;
    is_favorite: boolean;
}

export interface StockQuote {
    ticker: string;
    current: number;
    currency: string;
    previous_close?: number;
    previous_close_currency?: string;
}
