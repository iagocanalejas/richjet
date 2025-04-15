import os
import requests
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

FINNHUB_API_KEY = os.getenv("FINNHUB_API_KEY")
FINNHUB_BASE_URL = "https://finnhub.io/api/v1"
EXCHANGERATE_API_KEY = os.getenv("EXCHANGERATE_API_KEY")
EXCHANGERATE_BASE_URL = "https://v6.exchangerate-api.com/v6/"

cors_origins = []
if os.getenv("DEBUG", False):
    cors_origins = ["http://localhost:5173"]
if os.getenv("RENDER", False):
    cors_origins = ["https://richjet-web.onrender.com"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/exchangerate/{target}")
async def get_exchange_rate(target: str):
    """
    Fetches the exchange rate for the given target currency.
    """
    response = requests.get(
        f"{EXCHANGERATE_BASE_URL}{EXCHANGERATE_API_KEY}/pair/USD/{target}"
    )

    if response.status_code == 200:
        return response.json()
    else:
        return {"error": "Failed to fetch exchange rate"}


@app.get("/search")
async def search_stock(q: str | None):
    """
    Searches for a stock symbol using the Finnhub API.
    """
    if not q:
        return {"count": 0, "result": []}

    response = requests.get(
        f"{FINNHUB_BASE_URL}/search",
        params={"q": q, "token": FINNHUB_API_KEY},
    )

    if response.status_code == 200:
        return response.json()
    else:
        return {"error": "Failed to fetch stock data"}


@app.get("/quote/{symbol}")
async def get_quote(symbol: str):
    """
    Fetches the stock quote for the given symbol using the Finnhub API.
    """
    response = requests.get(
        f"{FINNHUB_BASE_URL}/quote",
        params={"symbol": symbol, "token": FINNHUB_API_KEY},
    )

    if response.status_code == 200:
        return response.json()
    else:
        return {"error": "Failed to fetch stock quote"}
