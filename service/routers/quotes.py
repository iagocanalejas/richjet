import httpx
from clients.google import GoogleClient
from db import get_db
from fastapi import APIRouter, Depends, HTTPException, Query
from log import logger
from models.quote import create_quote_history_point, get_quote_point
from models.rates import convert_to_currency

from routers.auth import get_session

router = APIRouter()
client = GoogleClient()


# TODO: add fallback to https://markets.ft.com/data/funds/tearsheet/historical?s=IE00BD0NCM55:EUR
@router.get("/")
async def get_quote(
    tickers: list[str] = Query(..., description="List of stock tickers"),
    db=Depends(get_db),
    session=Depends(get_session),
):
    """
    Fetches the stock quote for the given symbol.
    """
    quotes = list({t.upper() for t in tickers})
    if len(quotes) > 10:
        raise HTTPException(status_code=400, detail="maximum 10 tickers allowed per request")

    quotes = await get_quote_point(db, session, tickers)
    results = []

    for quote in quotes:
        if not quote.current or quote.current <= 0:
            try:
                logger.info(f"fetching new quote for {quote.ticker}")
                new_quote = await client.get_quote(quote.ticker)
                if new_quote and new_quote.current and new_quote.current > 0:
                    create_quote_history_point(db, new_quote)
                quote = quote.merge(new_quote)
            except HTTPException as e:
                logger.error(e.detail)
            except httpx.TimeoutException:
                logger.error(f"{client.NAME}: timeout")

        if quote:
            quote.current, _ = await convert_to_currency(session, quote.current, quote.currency)
            quote.previous_close, quote.currency = await convert_to_currency(
                session,
                quote.previous_close,
                quote.currency,
            )
            results.append(quote.to_dict())

    if not results:
        raise HTTPException(status_code=404, detail="no quote found for the given tickers")
    return results
