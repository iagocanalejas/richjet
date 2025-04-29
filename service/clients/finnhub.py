import requests
from fastapi import HTTPException
from log import logger

from clients._errors import (
    ERROR_FAILED_TO_FETCH_STOCK_DATA,
    ERROR_FAILED_TO_FETCH_STOCK_QUOTE,
)
from clients._types import StockQuote, StockSymbol, normalize_security_type
from pyutils.validators import is_valid_isin


class FinnhubClient:
    NAME = "finnhub"
    BASE_URL = "https://finnhub.io/api/v1"

    def __init__(self, api_key):
        self.api_key = api_key

    def search_stock(self, q: str) -> list[StockSymbol]:
        # adding the 'exchange' to the query improves the results
        response = requests.get(
            f"{self.BASE_URL}/search",
            params={"q": q, "exchange": "US", "token": self.api_key},
            timeout=5,
        )

        if response.status_code != 200:
            raise HTTPException(
                status_code=response.status_code,
                detail=f"{self.NAME}: {ERROR_FAILED_TO_FETCH_STOCK_DATA}",
            )

        results = response.json().get("result", [])
        valid_results = [r for r in results if r["type"].upper() in ["COMMON STOCK", "ETF", "ETP"]]
        logger.warning(f"{self.NAME}: discarding results={[r for r in results if r not in valid_results]}")

        return [
            StockSymbol(
                symbol=result["symbol"],
                name=result["description"],
                security_type=normalize_security_type(result["type"]),
                currency="USD",
                region="US",
                source=self.NAME,
                isin=q if is_valid_isin(q) else None,
            )
            for result in valid_results
        ]

    def get_quote(self, symbol: str) -> StockQuote:
        response = requests.get(
            f"{self.BASE_URL}/quote",
            params={"symbol": symbol, "token": self.api_key},
            timeout=5,
        )

        if response.status_code != 200:
            raise HTTPException(
                status_code=response.status_code,
                detail=f"{self.NAME}: {ERROR_FAILED_TO_FETCH_STOCK_QUOTE}",
            )

        data = response.json()
        if not data:
            raise HTTPException(
                status_code=404,
                detail=f"{self.NAME}: {ERROR_FAILED_TO_FETCH_STOCK_QUOTE}",
            )

        return StockQuote(
            symbol=symbol,
            current=data["c"],
            high=data["h"],
            low=data["l"],
            open=data["o"],
            previous_close=data["pc"],
        )
