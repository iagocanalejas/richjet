import logging
import os

import requests
from clients import FinnhubClient, VantageClient
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

EXCHANGERATE_API_KEY = os.getenv("EXCHANGERATE_API_KEY")
FINNHUB_API_KEY = os.getenv("FINNHUB_API_KEY")
FINNHUB_ENABLED = os.getenv("FINNHUB_ENABLED", False) == "True"
ALPHA_VANTAGE_API_KEY = os.getenv("ALPHA_VANTAGE_API_KEY")
ALPHA_VANTAGE_ENABLED = os.getenv("ALPHA_VANTAGE_ENABLED", False) == "True"

cors_origins = []
if os.getenv("DEBUG", False):
    cors_origins = ["http://localhost:5173"]
if os.getenv("RENDER", False):
    cors_origins = ["https://richjet-web.onrender.com", "https://iagocanalejas.com"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["GET"],
    allow_headers=["*"],
)

clients = []
services = [
    ("Finnhub", FINNHUB_ENABLED, FinnhubClient, FINNHUB_API_KEY),
    ("Alpha Vantage", ALPHA_VANTAGE_ENABLED, VantageClient, ALPHA_VANTAGE_API_KEY),
]
for name, enabled, client_class, api_key in services:
    if enabled:
        logging.info(f"{name} enabled")
        clients.append(client_class(api_key=api_key))


@app.get("/exchangerate/{target}")
async def get_exchange_rate(target: str):
    """
    Fetches the exchange rate for the given target currency.
    """
    response = requests.get(
        f"{'https://v6.exchangerate-api.com/v6'}/{EXCHANGERATE_API_KEY}/pair/USD/{target}",
        timeout=3,
    )

    if response.status_code != 200:
        return {"errors": ["Failed to fetch exchange rate"]}
    return response.json()


@app.get("/search")
async def search_stock(q: str | None):
    """
    Searches for a stock symbol using multipla APIs.
    """
    if not q:
        return {"count": 0, "results": [], "errors": []}

    results = set()
    errors = []

    for client in clients:
        try:
            result = client.search_stock(q)
            results = results.union(set(result))
        except HTTPException as e:
            errors.append({"client": client.NAME, "error": e.detail})

    results = [
        {
            "symbol": symbol.symbol,
            "name": symbol.name,
            "type": symbol.type,
            "currency": symbol.currency,
            "region": symbol.region,
            "source": symbol.source,
            "isin": symbol.isin,
        }
        for symbol in results
    ]
    return {
        "count": len(results),
        "results": sorted(results, key=lambda x: x["symbol"]),
        "errors": errors,
    }


@app.get("/quote/{source}/{symbol}")
async def get_quote(source: str, symbol: str):
    """
    Fetches the stock quote for the given symbol using the multiple APIs.
    """
    for client in clients:
        if client.NAME != source.lower():
            continue

        try:
            quote = client.get_quote(symbol)
            return {
                "symbol": quote.symbol,
                "current": quote.current,
                "high": quote.high,
                "low": quote.low,
                "open": quote.open,
                "previous_close": quote.previous_close,
            }
        except HTTPException as e:
            return {"errors": [{"client": client.NAME, "error": e.detail}]}
