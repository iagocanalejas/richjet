import httpx
from fastapi import HTTPException
from log import logger
from models.quote import StockQuote
from models.symbol import MarketSector, SecurityType, Symbol, is_supported_ticker

from clients._errors import (
    ERROR_FAILED_TO_FETCH_STOCK_DATA,
)
from pyutils.validators import is_valid_figi


class OpenFIGIClient:
    NAME = "openfigi"
    BASE_URL = "https://api.openfigi.com"

    def __init__(self, api_key=None):
        self.api_key = api_key

    async def search_stock(self, q: str) -> list[Symbol]:
        async with httpx.AsyncClient(timeout=5) as client:
            response = await client.post(
                f"{self.BASE_URL}/v3/search",
                json={"query": q},
                headers={"Content-Type": "application/json"},
            )

        if response.status_code != 200:
            raise HTTPException(
                status_code=response.status_code,
                detail=f"{self.NAME}: {ERROR_FAILED_TO_FETCH_STOCK_DATA}",
            )

        results = response.json().get("data", [])
        valid_results = [r for r in results if self._is_valid_result(r)]
        logger.warning(f"{self.NAME}: discarding results={[r for r in results if r not in valid_results]}")

        return [
            Symbol(
                ticker=result["ticker"],
                display_name=result["ticker"],
                name=result["name"],
                security_type=SecurityType.from_str(result["securityType"]),
                currency="USD",
                source=self.NAME,
                region=result.get("exchCode", None),
                market_sector=MarketSector.from_str(result["marketSector"]),
                figi=result["figi"] if is_valid_figi(result["figi"]) else None,
            )
            for result in valid_results
        ]

    def _is_valid_result(self, r):
        return (
            r["marketSector"].upper() in ["EQUITY"]
            and r["securityType"].upper() in ["COMMON STOCK", "ETP", "ETF", "GDR"]
            and not any(r[k] == "None" for k in ["ticker", "name", "exchCode", "marketSector", "figi", "securityType"])
            and is_supported_ticker(r["ticker"])
        )

    def get_quote(self, *args, **kwargs) -> StockQuote:
        raise NotImplementedError("OpenFIGI does not support get_quote")
