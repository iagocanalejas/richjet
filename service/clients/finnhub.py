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


class FinnhubClient:
    NAME = "finnhub"
    BASE_URL = "https://finnhub.io/api/v1"

    def __init__(self, api_key):
        self.api_key = api_key

    @alru_cache(maxsize=128)
    async def search_stock(self, q: str) -> list[Symbol]:
        if len(q) > 20:
            logger.error(f"{self.NAME}: search query too long: {q}")
            return []
        async with httpx.AsyncClient(timeout=5) as client:
            # adding the 'exchange' to the query improves the results
            response = await client.get(
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
        valid_results = [r for r in results if self._is_valid_result(r)]
        logger.warning(f"{self.NAME}: discarding results={[r for r in results if r not in valid_results]}")

        return [
            Symbol(
                ticker=result["symbol"],
                display_name=result["symbol"],
                name=result["description"],
                security_type=SecurityType.from_str(result["type"]),
                currency="USD",
                region="US",
                source=self.NAME,
                isin=q if is_valid_isin(q) else None,
            )
            for result in valid_results
        ]

    def _is_valid_result(self, r):
        return r["type"].upper() in ["COMMON STOCK", "ETF", "ETP"] and is_supported_ticker(r["symbol"])

    @alru_cache(maxsize=128)
    async def get_quote(self, symbol: str) -> StockQuote:
        async with httpx.AsyncClient(timeout=5) as client:
            response = await client.get(
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
