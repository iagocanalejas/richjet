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


class CNBCClient:
    NAME = "cnbc"
    BASE_URL = "https://quote.cnbc.com/"

    def __init__(self, api_key):
        self.api_key = api_key

    @alru_cache(maxsize=128)
    async def search_stock(self, q: str) -> list[Symbol]:
        async with httpx.AsyncClient(timeout=5) as client:
            response = await client.get(
                f"https://symlookup.cnbc.com/symlookup.do?prefix={q}&output=json",
                timeout=5,
            )

        if response.status_code != 200:
            raise HTTPException(
                status_code=response.status_code,
                detail=f"{self.NAME}: {ERROR_FAILED_TO_FETCH_STOCK_DATA}",
            )

        results = response.json()
        if len(results) == 0:
            return []

        results = results[1:]
        valid_results = [r for r in results if is_supported_ticker(r["symbolName"])]
        logger.warning(f"{self.NAME}: discarding results={[r for r in results if r not in valid_results]}")

        print(valid_results)

        return [
            Symbol(
                ticker=result["symbolName"].upper(),
                name=result["companyName"],
                security_type=SecurityType.from_str(result["issueType"]),
                currency="USD",
                region=result["countryCode"],
                source=self.NAME,
            )
            for result in valid_results
        ]

    @alru_cache(maxsize=128)
    async def get_quote(self, symbol: str):
        async with httpx.AsyncClient(timeout=5) as client:
            response = await client.get(
                f"https://quote.cnbc.com/quote-html-webservice/quote.htm?symbols={symbol}&output=json",
                timeout=5,
            )

        print(response)

        if response.status_code != 200:
            raise HTTPException(
                status_code=response.status_code,
                detail=f"{self.NAME}: {ERROR_FAILED_TO_FETCH_STOCK_QUOTE}",
            )

        data = response.json().get("QuickQuoteResult", None)
        data = data.get("QuickQuote", None) if data else None
        data = data[0] if isinstance(data, list) and len(data) > 0 else None
        if not data:
            raise HTTPException(
                status_code=404,
                detail=f"{self.NAME}: {ERROR_FAILED_TO_FETCH_STOCK_QUOTE}",
            )

        return StockQuote(
            symbol=symbol.upper(),
            current=float(data["last"]),
            high=float(data["high"]),
            low=float(data["low"]),
            open=float(data["open"]),
            previous_close=float(data["previous_day_closing"]),
            currency=data.get("currencyCode", None),
        )
