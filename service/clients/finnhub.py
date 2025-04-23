import requests
from fastapi import HTTPException

from clients._errors import (
    ERROR_FAILED_TO_FETCH_STOCK_DATA,
    ERROR_FAILED_TO_FETCH_STOCK_QUOTE,
)
from clients._types import StockQuote, StockSymbol


class FinnhubClient:
    NAME = "finnhub"
    BASE_URL = "https://finnhub.io/api/v1"

    def __init__(self, api_key):
        self.api_key = api_key

    def search_stock(self, q: str) -> list[StockSymbol]:
        response = requests.get(
            f"{self.BASE_URL}/search",
            params={"q": q, "token": self.api_key},
            timeout=3,
        )

        if response.status_code != 200:
            raise HTTPException(
                status_code=response.status_code,
                detail=f"finnhub: {ERROR_FAILED_TO_FETCH_STOCK_DATA}",
            )

        results = response.json().get("result", [])
        return [
            StockSymbol(
                symbol=result["symbol"],
                name=result["description"],
                type=result["type"],
                currency="USD",
                region="United States",
                source=self.NAME,
            )
            for result in results
        ]

    def get_quote(self, symbol: str) -> StockQuote:
        response = requests.get(
            f"{self.BASE_URL}/quote",
            params={"symbol": symbol, "token": self.api_key},
            timeout=3,
        )

        if response.status_code != 200:
            raise HTTPException(
                status_code=response.status_code,
                detail=f"finnhub: {ERROR_FAILED_TO_FETCH_STOCK_QUOTE}",
            )

        data = response.json()
        return StockQuote(
            symbol=symbol,
            current=data["c"],
            high=data["h"],
            low=data["l"],
            open=data["o"],
            previous_close=data["pc"],
        )
