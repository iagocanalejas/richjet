import re

import httpx
from async_lru import alru_cache
from fastapi import HTTPException
from models.quote import StockQuote
from models.symbol import Symbol
from parsel import Selector

from clients._errors import ERROR_FAILED_TO_FETCH_STOCK_DATA, ERROR_FAILED_TO_FETCH_STOCK_QUOTE
from pyutils.strings import split_money, symbol_to_currency, whitespaces_clean
from pyutils.validators import is_valid_isin


class GoogleClient:
    NAME = "google"
    BASE_URL = "https://www.google.com/finance/quote"

    @alru_cache(maxsize=128)
    async def search_stock(self, q: str) -> list[Symbol]:
        async with httpx.AsyncClient(timeout=5) as client:
            resp = await client.get(
                f"{self.BASE_URL}/{q}",
                headers={
                    "User-Agent": "python-requests/2.31.0",
                    "Accept": "*/*",
                    "Connection": "keep-alive",
                },
                timeout=5,
                follow_redirects=True,
            )

        if resp.status_code != 200:
            raise HTTPException(
                status_code=resp.status_code,
                detail=f"{self.NAME}: {ERROR_FAILED_TO_FETCH_STOCK_DATA}",
            )

        selector = Selector(resp.content.decode("utf-8"))
        results = selector.xpath('//*[@id="yDmH0d"]/c-wiz[2]/div/div[4]/div/div/div[3]/ul/li/a').getall()
        results = [Selector(r) for r in results]

        symbols = []
        for r in results:
            ticker = whitespaces_clean(r.xpath("//*/@href").get("").split("/")[-1])
            display_name = whitespaces_clean(r.xpath("//*/div/div/div[1]/div[2]/div/text()").get(""))
            currency, price = split_money(r.xpath("//*/div/div/div[2]/span/div/div/text()").get(""))
            currency = symbol_to_currency(currency) if currency else "USD"

            open_price = None
            change = whitespaces_clean(r.xpath("//*/div/div/div[3]/span/div/div/text()").get(""))
            match = re.search(r"[\d,\.]+", change)
            change = float(match.group(0).replace(",", ".")) if match else None
            if change and price:
                change = price * (abs(change) / 100)
                symbol = r.xpath("//*/div/div/div[3]/span/div/div/span/svg/path/@d").get("")
                open_price = price - change if self.is_percentage_increase(symbol) else price + change

            symbols.append(
                Symbol(
                    ticker=ticker,
                    display_name=display_name,
                    name=display_name,
                    source=self.NAME,
                    isin=q if is_valid_isin(q) else None,
                    currency=currency or "USD",
                    picture=f"https://assets.parqet.com/logos/symbol/{ticker}",
                    price=price,
                    open_price=open_price,
                )
            )

        return symbols

    @alru_cache(maxsize=128)
    async def get_quote(self, symbol: str) -> StockQuote:
        async with httpx.AsyncClient(timeout=5) as client:
            resp = await client.get(
                f"{self.BASE_URL}/{symbol}",
                headers={
                    "User-Agent": "python-requests/2.31.0",
                    "Accept": "*/*",
                    "Connection": "keep-alive",
                },
                timeout=5,
                follow_redirects=True,
            )

        if resp.status_code != 200:
            raise HTTPException(
                status_code=resp.status_code,
                detail=f"{self.NAME}: {ERROR_FAILED_TO_FETCH_STOCK_QUOTE}",
            )

        selector = Selector(resp.content.decode("utf-8"))
        data = Selector(selector.xpath("/html/body/c-wiz[2]/div/div[4]/div/main/div[2]").get(""))

        currency = data.xpath("//*/div[1]/div[1]/c-wiz/div/div[1]/div/div[1]/div/div[1]/div/span/div/div/text()")
        currency, price = split_money(currency.get(""))

        return StockQuote(
            ticker=symbol,
            current=price or 0.0,
            currency=symbol_to_currency(currency) if currency else "USD",
        )

    @staticmethod
    def is_percentage_increase(symbol: str) -> bool:
        return symbol == "M4 12l1.41 1.41L11 7.83V20h2V7.83l5.58 5.59L20 12l-8-8-8 8z"
