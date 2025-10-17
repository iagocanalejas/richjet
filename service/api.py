import os

import httpx
import stripe
from clients.google import GoogleClient
from db import get_db
from fastapi import Depends, FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from log import logger
from models.symbol import Symbol, search_symbol
from models.user import unsubscribe, update_stripe_customer, update_stripe_plan
from routers import accounts, auth, quotes, symbols, transactions, users, watchlist
from routers import stripe as stripe_route

app = FastAPI()

app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(stripe_route.router, prefix="/checkout", tags=["checkout"])
app.include_router(users.router, prefix="/users", tags=["users"])
app.include_router(transactions.router, prefix="/transactions", tags=["transactions"])
app.include_router(accounts.router, prefix="/accounts", tags=["accounts"])
app.include_router(watchlist.router, prefix="/watchlist", tags=["watchlist"])
app.include_router(symbols.router, prefix="/symbols", tags=["symbols"])
app.include_router(quotes.router, prefix="/quotes", tags=["quotes"])

EXCHANGERATE_API_KEY = os.getenv("EXCHANGERATE_API_KEY")

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
