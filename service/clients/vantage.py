import httpx
from async_lru import alru_cache
from fastapi import HTTPException
from log import logger
from models.quote import StockQuote
from models.symbol import SecurityType, Symbol, is_supported_ticker

from clients._errors import (
    ERROR_FAILED_TO_FETCH_STOCK_DATA,
    ERROR_FAILED_TO_FETCH_STOCK_QUOTE,
)
from pyutils.validators import is_valid_isin


class VantageClient:
    NAME = "vantage"
    BASE_URL = "https://www.alphavantage.co/query"

    def __init__(self, api_key):
        self.api_key = api_key

    @alru_cache(maxsize=128)
    async def search_stock(self, q: str) -> list[Symbol]:
        async with httpx.AsyncClient(timeout=5) as client:
            response = await client.get(
                f"{self.BASE_URL}/query",
                params={"function": "SYMBOL_SEARCH", "keywords": q, "apikey": self.api_key},
                timeout=5,
            )

        if response.status_code != 200:
            raise HTTPException(
                status_code=response.status_code,
                detail=f"{self.NAME}: {ERROR_FAILED_TO_FETCH_STOCK_DATA}",
            )

        results = response.json().get("bestMatches", [])
        valid_results = [r for r in results if r["3. type"].upper() in ["EQUITY", "ETF"]]
        logger.warning(f"{self.NAME}: discarding results={[r for r in results if r not in valid_results]}")

        return [
            Symbol(
                ticker=result["1. symbol"],
                display_name=result["1. symbol"],
                name=result["2. name"],
                security_type=SecurityType.from_str(result["3. type"]),
                currency=result["8. currency"],
                region=result["4. region"],
                source=self.NAME,
                isin=q if is_valid_isin(q) else None,
            )
            for result in valid_results
        ]

    def _is_valid_result(self, r):
        return r["3. type"].upper() in ["EQUITY", "ETF"] and is_supported_ticker(r["1. symbol"])

    @alru_cache(maxsize=128)
    async def get_quote(self, symbol: str):
        async with httpx.AsyncClient(timeout=5) as client:
            response = await client.get(
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
                detail=f"{self.NAME}: {ERROR_FAILED_TO_FETCH_STOCK_QUOTE}",
            )

        data = response.json().get("Global Quote", None)
        if not data:
            raise HTTPException(
                status_code=404,
                detail=f"{self.NAME}: {ERROR_FAILED_TO_FETCH_STOCK_QUOTE}",
            )

        return StockQuote(
            symbol=symbol,
            current=float(data["05. price"]),
            high=float(data["03. high"]),
            low=float(data["04. low"]),
            open=float(data["02. open"]),
            previous_close=float(data["08. previous close"]),
        )
