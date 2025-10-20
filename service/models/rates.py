import os
from decimal import Decimal
from json import JSONDecodeError

import httpx
from async_lru import alru_cache
from log import logger

from models.session import Session

EXCHANGERATE_API_KEY = os.getenv("EXCHANGERATE_API_KEY")


def _normalize_currency_args(func):
    async def wrapper(from_currency: str, to_currency: str):
        return await func(from_currency.upper(), to_currency.upper())

    return wrapper


@_normalize_currency_args
@alru_cache(maxsize=128)
async def _get_exchange_rate(from_currency: str, to_currency: str):
    url = f"{'https://v6.exchangerate-api.com/v6'}/{EXCHANGERATE_API_KEY}/pair/{from_currency}/{to_currency}"
    async with httpx.AsyncClient(timeout=3) as client:
        response = await client.get(url)
    if response.status_code != 200:
        logger.error(f"failed to fetch exchange rate: {response.status_code}:{response.text}")
        return 1.0

    try:
        return float(response.json()["conversion_rate"])
    except (JSONDecodeError, KeyError, ValueError):
        logger.error(f"invalid exchange rate data: {response.text}")
    return 1.0


async def convert_to_currency(
    session: Session,
    amount: Decimal | float | None,
    from_currency: str | None,
) -> tuple[float | None, str]:
    if isinstance(amount, Decimal):
        amount = float(amount)
    if not amount or not from_currency or from_currency.upper() == session.currency:
        return amount, session.currency
    rate = await _get_exchange_rate(from_currency, session.currency)
    return amount * rate, session.currency
