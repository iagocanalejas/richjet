import os

import requests
from clients import FinnhubClient, VantageClient
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

EXCHANGERATE_API_KEY = os.getenv("EXCHANGERATE_API_KEY")
EXCHANGERATE_BASE_URL = "https://v6.exchangerate-api.com/v6"
FINNHUB_API_KEY = os.getenv("FINNHUB_API_KEY")
ALPHA_VANTAGE_API_KEY = os.getenv("ALPHA_VANTAGE_API_KEY")

cors_origins = []
if os.getenv("DEBUG", False):
    cors_origins = ["http://localhost:5173"]
if os.getenv("RENDER", False):
    cors_origins = ["https://richjet-web.onrender.com", "https://iagocanalejas.com"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

clients = [
    FinnhubClient(api_key=FINNHUB_API_KEY),
    VantageClient(api_key=ALPHA_VANTAGE_API_KEY),
]


@app.get("/exchangerate/{target}")
async def get_exchange_rate(target: str):
    """
    Fetches the exchange rate for the given target currency.
    """
    response = requests.get(
        f"{EXCHANGERATE_BASE_URL}/{EXCHANGERATE_API_KEY}/pair/USD/{target}",
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
