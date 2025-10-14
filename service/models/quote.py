from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException
from psycopg2.extensions import connection as Connection
from psycopg2.extras import RealDictCursor, RealDictRow

from models.symbol import get_symbol_by_ticker


@dataclass
class StockQuote:
    ticker: str
    current: float | None = None
    currency: str | None = None
    previous_close: float | None = None
    previous_close_currency: str | None = None

    @classmethod
    def from_row(cls, row: RealDictRow) -> "StockQuote":
        return cls(
            ticker=row["ticker"],
            current=row["current"],
            previous_close=row.get("previous_close"),
            currency=row.get("currency"),
        )

    def merge(self, other: "StockQuote") -> "StockQuote":
        return StockQuote(
            ticker=self.ticker or other.ticker,
            current=self.current or other.current,
            currency=self.currency or other.currency,
            previous_close=self.previous_close or other.previous_close,
            previous_close_currency=self.previous_close_currency or other.previous_close_currency,
        )

    def to_dict(self) -> dict:
        assert self.current is not None, "currency is required"
        return {
            "ticker": self.ticker,
            "current": self.current,
            "previous_close": self.previous_close,
            "currency": self.currency,
        }


def get_quote_point(db: Connection, ticker: str) -> StockQuote | None:
    sql = """
    SELECT s.ticker, qp.price AS current, qp.currency, qp.created_at
    FROM symbols s
    JOIN quote_history qp ON qp.symbol_id = s.id
    WHERE s.ticker = %s
    ORDER BY qp.created_at DESC
    LIMIT 2
    """

    with db.cursor(cursor_factory=RealDictCursor) as cursor:
        cursor.execute(sql, (ticker,))
        rows = cursor.fetchall()

    if not rows:
        return None

    maybe_today_quote = rows[0]
    maybe_yesterday_quote = rows[1] if len(rows) > 1 else None

    today = datetime.now(timezone.utc).date()
    created_date = maybe_today_quote["created_at"].date()

    if created_date not in (today, today - timedelta(days=1)):
        # no recent quotes
        return None

    if created_date == (today - timedelta(days=1)):
        return StockQuote(
            ticker=ticker,
            previous_close=maybe_today_quote["current"],
            previous_close_currency=maybe_today_quote["currency"],
        )

    if created_date == today:
        quote = StockQuote(
            ticker=ticker,
            current=maybe_today_quote["current"],
            currency=maybe_today_quote["currency"],
        )
        if maybe_yesterday_quote and maybe_yesterday_quote["created_at"].date() == (today - timedelta(days=1)):
            quote.previous_close = maybe_yesterday_quote["current"]
            quote.previous_close_currency = maybe_yesterday_quote["currency"]
        return quote


def create_quote_history_point(db: Connection, quote: StockQuote) -> None:
    if not quote.ticker:
        raise HTTPException(status_code=400, detail="ticker is required")
    if not quote.current or quote.current <= 0:
        raise HTTPException(status_code=400, detail="invalid price")

    symbol = get_symbol_by_ticker(db, quote.ticker)

    sql = """
    INSERT INTO quote_history (symbol_id, price, currency)
    VALUES (%s, %s, %s)
    RETURNING id
    """

    with db.cursor() as cursor:
        cursor.execute(sql, (symbol.id, quote.current, quote.currency))
        row = cursor.fetchone()
    if not row:
        raise HTTPException(status_code=500, detail="failed to create quote point")
    db.commit()
