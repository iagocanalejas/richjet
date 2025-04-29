import functools
import os

import requests
from clients import FinnhubClient, OpenFIGIClient, VantageClient
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from clients._types import StockQuote
from log import logger

app = FastAPI()

EXCHANGERATE_API_KEY = os.getenv("EXCHANGERATE_API_KEY")
FINNHUB_API_KEY = os.getenv("FINNHUB_API_KEY")
FINNHUB_ENABLED = os.getenv("FINNHUB_ENABLED", False) == "True"
ALPHA_VANTAGE_API_KEY = os.getenv("ALPHA_VANTAGE_API_KEY")
ALPHA_VANTAGE_ENABLED = os.getenv("ALPHA_VANTAGE_ENABLED", False) == "True"
OPENFIGI_ENABLED = os.getenv("OPENFIGI_ENABLED", False) == "True"

cors_origins = []
if os.getenv("DEBUG", False) == "True":
    cors_origins = ["http://localhost:5173"]
if os.getenv("RENDER", False) == "True":
    cors_origins = ["https://richjet-web.onrender.com", "https://iagocanalejas.com"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["GET"],
    allow_headers=["*"],
)

services = [
    (FinnhubClient.NAME, FINNHUB_ENABLED, FinnhubClient, FINNHUB_API_KEY),
    (VantageClient.NAME, ALPHA_VANTAGE_ENABLED, VantageClient, ALPHA_VANTAGE_API_KEY),
    (OpenFIGIClient.NAME, OPENFIGI_ENABLED, OpenFIGIClient, None),
]

clients = {}
for name, enabled, client_class, api_key in services:
    if enabled:
        logger.info(f"{name} enabled")
        clients[name] = client_class(api_key=api_key)


@functools.lru_cache(maxsize=128)
def _cached_get_exchange_rate(target: str):
    response = requests.get(
        f"{'https://v6.exchangerate-api.com/v6'}/{EXCHANGERATE_API_KEY}/pair/USD/{target}",
        timeout=3,
    )
    if response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail="failed to fetch exchange rate")
    return response.json()


@app.get("/exchangerate/{target}")
async def get_exchange_rate(target: str):
    """
    Fetches the exchange rate for the given target currency.
    """
    return _cached_get_exchange_rate(target)


@app.get("/search")
async def search_stock(q: str | None):
    """
    Searches for a stock symbol using multipla APIs.
    """
    if not q:
        return {"count": 0, "results": []}

    results = set([])
    errors = []
    for client in clients.values():
        try:
            results = results.union(set(client.search_stock(q)))
        except HTTPException as e:
            errors.append(e)

    if not results:
        if not errors:
            raise HTTPException(status_code=404, detail="results no found for query")
        raise HTTPException(status_code=400, detail=[e.detail for e in errors])

    results = [
        {
            "symbol": symbol.symbol,
            "name": symbol.name,
            "security_type": symbol.security_type.value,
            "currency": symbol.currency,
            "source": symbol.source,
            "region": symbol.region,
            "market_sector": symbol.market_sector.value if symbol.market_sector else None,
            "isin": symbol.isin,
            "figi": symbol.figi,
        }
        for symbol in results
    ]
    return {
        "count": len(results),
        "results": sorted(results, key=lambda x: x["symbol"]),
    }


@app.get("/quote/{source}/{symbol}")
async def get_quote(source: str, symbol: str):
    """
    Fetches the stock quote for the given symbol using the multiple APIs.
    """
    quote: StockQuote | None = None
    if source == OpenFIGIClient.NAME:
        # TODO: check a way of better retrieve the quotes
        for client in clients.values():
            if client.NAME == OpenFIGIClient.NAME:
                continue
            try:
                quote = client.get_quote(symbol)
                break
            except HTTPException:
                continue
    else:
        quote = clients[source].get_quote(symbol)
    if not quote:
        raise HTTPException(status_code=404, detail=f"{source}: no quote found for {symbol}")

    return {
        "symbol": quote.symbol,
        "current": quote.current,
        "high": quote.high,
        "low": quote.low,
        "open": quote.open,
        "previous_close": quote.previous_close,
    }
