import json

import requests
from fastapi import HTTPException
from log import logger

from clients._errors import (
    ERROR_FAILED_TO_FETCH_STOCK_DATA,
)
from clients._types import StockQuote, StockSymbol, normalize_market_sector, normalize_security_type
from pyutils.validators import is_valid_figi


class OpenFIGIClient:
    NAME = "openfigi"
    BASE_URL = "https://api.openfigi.com"

    def __init__(self, api_key=None):
        self.api_key = api_key

    def search_stock(self, q: str) -> list[StockSymbol]:
        response = requests.post(
            f"{self.BASE_URL}/v3/search",
            data=bytes(json.dumps({"query": q}), encoding="utf-8"),
            headers={"Content-Type": "application/json"},
            timeout=5,
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
            StockSymbol(
                symbol=result["ticker"],
                name=result["name"],
                security_type=normalize_security_type(result["securityType"]),
                currency="USD",
                source=self.NAME,
                region=result.get("exchCode", None),
                market_sector=normalize_market_sector(result["marketSector"]),
                figi=result["figi"] if is_valid_figi(result["figi"]) else None,
            )
            for result in valid_results
        ]

    def _is_valid_result(self, r):
        return (
            r["marketSector"].upper() in ["EQUITY"]
            and r["securityType"].upper() in ["COMMON STOCK", "ETP", "ETF", "GDR"]
            and not any(r[k] == "None" for k in ["ticker", "name", "exchCode", "marketSector", "figi", "securityType"])
        )

    def get_quote(self, *args, **kwargs) -> StockQuote:
        raise NotImplementedError("OpenFIGI does not support get_quote")
