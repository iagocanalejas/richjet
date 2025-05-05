import os

import httpx
from async_lru import alru_cache
from clients import FinnhubClient, OpenFIGIClient, VantageClient
from clients._types import StockQuote
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from log import logger

app = FastAPI()

EXCHANGERATE_API_KEY = os.getenv("EXCHANGERATE_API_KEY")
FINNHUB_API_KEY = os.getenv("FINNHUB_API_KEY")
FINNHUB_ENABLED = os.getenv("FINNHUB_ENABLED", False) == "True"
ALPHA_VANTAGE_API_KEY = os.getenv("ALPHA_VANTAGE_API_KEY")
ALPHA_VANTAGE_ENABLED = os.getenv("ALPHA_VANTAGE_ENABLED", False) == "True"
OPENFIGI_ENABLED = os.getenv("OPENFIGI_ENABLED", False) == "True"

cors_origins = ["https://richjet-web.onrender.com", "https://iagocanalejas.com"]
if os.getenv("DEBUG", False) == "True":
    cors_origins = ["http://localhost:5173"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["GET"],
    allow_headers=["*"],
)

services = [
    (OpenFIGIClient.NAME, OPENFIGI_ENABLED, OpenFIGIClient, None),
    (FinnhubClient.NAME, FINNHUB_ENABLED, FinnhubClient, FINNHUB_API_KEY),
    (VantageClient.NAME, ALPHA_VANTAGE_ENABLED, VantageClient, ALPHA_VANTAGE_API_KEY),
]

clients = {}
for name, enabled, client_class, api_key in services:
    if enabled:
        logger.info(f"{name} enabled")
        clients[name] = client_class(api_key=api_key)


@alru_cache(maxsize=128)
async def _cached_get_exchange_rate(target: str):
    url = f"{'https://v6.exchangerate-api.com/v6'}/{EXCHANGERATE_API_KEY}/pair/USD/{target}"
    async with httpx.AsyncClient(timeout=3) as client:
        response = await client.get(url)
    if response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail="failed to fetch exchange rate")
    return response.json()


@app.get("/exchangerate/{target}")
async def get_exchange_rate(target: str):
    """
    Fetches the exchange rate for the given target currency.
    """
    return await _cached_get_exchange_rate(target)


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
            results = results.union(set(await client.search_stock(q)))
        except (HTTPException, httpx.TimeoutException) as e:
            errors.append(e)

    if not results and errors:
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


async def _get_stock_quote_or_none(client, symbol: str) -> StockQuote | None:
    try:
        return await client.get_quote(symbol)
    except HTTPException as e:
        logger.error(f"{client.NAME}: {e.detail}")
    except httpx.TimeoutException:
        logger.error(f"{client.NAME}: timeout")
    return None


@app.get("/quote/{source}/{symbol}")
async def get_quote(source: str, symbol: str):
    """
    Fetches the stock quote for the given symbol using the multiple APIs.
    """
    if source not in [s[0] for s in services]:
        raise HTTPException(status_code=400, detail=f"{source=} not supported")

    quote: StockQuote | None = None
    if source != OpenFIGIClient.NAME:
        quote = await _get_stock_quote_or_none(clients[source], symbol)

    if not quote:
        # TODO: check a way of better retrieve the quotes
        for client in clients.values():
            if client.NAME == source or client.NAME == OpenFIGIClient.NAME:
                continue
            quote = await _get_stock_quote_or_none(client, symbol)
            if quote:
                break

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
