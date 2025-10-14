import os

import httpx
import stripe
from async_lru import alru_cache
from clients.google import GoogleClient
from db import get_db
from fastapi import Depends, FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from log import logger
from models.quote import create_quote_history_point, get_quote_point
from models.symbol import Symbol, search_symbol
from models.user import unsubscribe, update_stripe_customer, update_stripe_plan
from routers import accounts, auth, symbols, transactions, users, watchlist
from routers import stripe as stripe_route

app = FastAPI()

app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(stripe_route.router, prefix="/checkout", tags=["checkout"])
app.include_router(users.router, prefix="/users", tags=["users"])
app.include_router(transactions.router, prefix="/transactions", tags=["transactions"])
app.include_router(accounts.router, prefix="/accounts", tags=["accounts"])
app.include_router(watchlist.router, prefix="/watchlist", tags=["watchlist"])
app.include_router(symbols.router, prefix="/symbols", tags=["symbols"])

EXCHANGERATE_API_KEY = os.getenv("EXCHANGERATE_API_KEY")
FINNHUB_API_KEY = os.getenv("FINNHUB_API_KEY")
FINNHUB_ENABLED = os.getenv("FINNHUB_ENABLED", False) == "True"
ALPHA_VANTAGE_API_KEY = os.getenv("ALPHA_VANTAGE_API_KEY")
ALPHA_VANTAGE_ENABLED = os.getenv("ALPHA_VANTAGE_ENABLED", False) == "True"
OPENFIGI_ENABLED = os.getenv("OPENFIGI_ENABLED", False) == "True"
CNBC_ENABLED = os.getenv("CNBC_ENABLED", False) == "True"

cors_origins = ["https://richjet-web.onrender.com", "https://richjet.me"]
if os.getenv("DEBUG", False) == "True":
    cors_origins = ["http://localhost:5173"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"],
    allow_headers=["*"],
)

client = GoogleClient()


@alru_cache(maxsize=128)
async def _cached_get_exchange_rate(from_currency: str, to_currency: str):
    url = f"{'https://v6.exchangerate-api.com/v6'}/{EXCHANGERATE_API_KEY}/pair/{from_currency}/{to_currency}"
    async with httpx.AsyncClient(timeout=3) as client:
        response = await client.get(url)
    if response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail="failed to fetch exchange rate")
    return response.json()


@app.get("/exchangerate/{from_currency}/{to_currency}")
async def get_exchange_rate(from_currency: str, to_currency: str):
    """
    Fetches the exchange rate for the given target currency.
    """
    return await _cached_get_exchange_rate(from_currency, to_currency)


@app.get("/search")
async def search_stock(
    q: str | None,
    load_more: bool = False,
    db=Depends(get_db),
):
    """
    Searches for a stock symbol using multipla APIs.
    """
    if not q:
        return {"count": 0, "results": []}

    result_set: list[Symbol] = []
    errors = []

    if load_more:  # load more results from the APIs
        try:
            result_set.extend(await client.search_stock(q))
        except (HTTPException, httpx.TimeoutException) as e:
            errors.append(e)
    else:
        result_set = search_symbol(db, q)

    if not result_set and errors:
        raise HTTPException(status_code=400, detail=[e.detail for e in errors])

    return {
        "count": len(result_set),
        "results": [symbol.to_dict() for symbol in result_set],
    }


@app.get("/quote/{ticker}")
async def get_quote(ticker: str, db=Depends(get_db)):
    """
    Fetches the stock quote for the given symbol.
    """
    quote = get_quote_point(db, ticker)
    # TODO: receive a list of quotes to reduce the number of API calls

    if not quote or not quote.current or quote.current <= 0:
        try:
            logger.info(f"fetching new quote for {ticker}")
            new_quote = await client.get_quote(ticker)
            if new_quote and new_quote.current and new_quote.current > 0:
                create_quote_history_point(db, new_quote)
            quote = quote.merge(new_quote) if quote else new_quote
        except HTTPException as e:
            logger.error(e.detail)
        except httpx.TimeoutException:
            logger.error(f"{client.NAME}: timeout")

    if not quote:
        raise HTTPException(status_code=404, detail=f"no quote found for {ticker}")

    # TODO: add fallback to https://markets.ft.com/data/funds/tearsheet/historical?s=IE00BD0NCM55:EUR
    return quote.to_dict()


@app.post("/webhook")
async def stripe_webhook(request: Request, db=Depends(get_db)):
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET")

    try:
        event = stripe.Webhook.construct_event(payload, sig_header, STRIPE_WEBHOOK_SECRET)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")

    if event["type"] == "checkout.session.completed":
        try:
            data = event["data"]["object"]
            user_id = data["metadata"].get("user_id")
            customer_id = data.get("customer")
        except (KeyError, IndexError, TypeError) as e:
            logger.error(f"Missing key in event data: {e}")
            raise HTTPException(status_code=400, detail="Invalid event data")
        update_stripe_customer(db, user_id, customer_id)
    elif event["type"] == "customer.subscription.created":
        try:
            data = event["data"]["object"]
            customer_id = data.get("customer")
            price_id = data["items"]["data"][0]["price"]["id"]
        except (KeyError, IndexError, TypeError) as e:
            logger.error(f"Missing key in event data: {e}")
            raise HTTPException(status_code=400, detail="Invalid event data")
        update_stripe_plan(db, customer_id, price_id)
    elif event["type"] == "customer.subscription.deleted":
        try:
            data = event["data"]["object"]
            customer_id = data.get("customer")
        except (KeyError, IndexError, TypeError) as e:
            logger.error(f"Missing key in event data: {e}")
            raise HTTPException(status_code=400, detail="Invalid event data")
        unsubscribe(db, customer_id)

    return {"status": "success"}


@app.head("/healthz")
async def health_check():
    return Response(status_code=200)
