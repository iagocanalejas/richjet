import logging

import requests
from fastapi import HTTPException

from clients._errors import (
    ERROR_FAILED_TO_FETCH_STOCK_DATA,
    ERROR_FAILED_TO_FETCH_STOCK_QUOTE,
)
from clients._types import StockQuote, StockSymbol, is_valid_isin, normalize_type


class VantageClient:
    NAME = "vantage"
    BASE_URL = "https://www.alphavantage.co/query"

    def __init__(self, api_key):
        self.api_key = api_key

    def search_stock(self, q: str) -> list[StockSymbol]:
        response = requests.get(
            f"{self.BASE_URL}/query",
            params={"function": "SYMBOL_SEARCH", "keywords": q, "apikey": self.api_key},
            timeout=5,
        )

        if response.status_code != 200:
            raise HTTPException(
                status_code=response.status_code,
                detail=f"vantage: {ERROR_FAILED_TO_FETCH_STOCK_DATA}",
            )

        results = response.json().get("bestMatches", [])
        valid_results = [r for r in results if r["3. type"].upper() in ["EQUITY", "ETF"]]
        logging.warning(f"vantage: discarding results={[r for r in results if r not in valid_results]}")

        return [
            StockSymbol(
                symbol=result["1. symbol"],
                name=result["2. name"],
                type=normalize_type(result["3. type"]),
                currency=result["8. currency"],
                region=result["4. region"],
                source=self.NAME,
                isin=q if is_valid_isin(q) else None,
            )
            for result in valid_results
        ]

    def get_quote(self, symbol: str):
        response = requests.get(
            f"{self.BASE_URL}/query",
            params={
                "function": "GLOBAL_QUOTE",
                "symbol": symbol,
                "apikey": self.api_key,
            },
            timeout=5,
        )

        if response.status_code != 200:
            raise HTTPException(
                status_code=response.status_code,
                detail=f"vantage: {ERROR_FAILED_TO_FETCH_STOCK_QUOTE}",
            )

        data = response.json()["Global Quote"]
        return StockQuote(
            symbol=symbol,
            current=float(data["05. price"]),
            high=float(data["03. high"]),
            low=float(data["04. low"]),
            open=float(data["02. open"]),
            previous_close=float(data["08. previous close"]),
        )
