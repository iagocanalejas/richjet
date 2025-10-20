import httpx
from clients.google import GoogleClient
from db import get_db
from fastapi import APIRouter, Depends, HTTPException
from log import logger
from models.quote import create_quote_history_point, get_quote_point
from models.rates import convert_to_currency

from routers.auth import get_session

router = APIRouter()
client = GoogleClient()


# TODO: receive a list of quotes to reduce the number of API calls
# TODO: add fallback to https://markets.ft.com/data/funds/tearsheet/historical?s=IE00BD0NCM55:EUR
@router.get("/{ticker}")
async def get_quote(
    ticker: str,
    db=Depends(get_db),
    session=Depends(get_session),
):
    """
    Fetches the stock quote for the given symbol.
    """
    quote = get_quote_point(db, ticker)

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

    quote.current, quote.currency = await convert_to_currency(session, quote.current, quote.currency)
    quote.previous_close, quote.previous_close_currency = await convert_to_currency(
        session,
        quote.previous_close,
        quote.previous_close_currency,
    )
    return quote.to_dict()
