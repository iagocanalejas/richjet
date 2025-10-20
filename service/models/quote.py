from dataclasses import dataclass

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
        SELECT qp_today.price AS price, qp_today.currency AS currency,
            qp_yesterday.price AS open_price, qp_yesterday.currency AS open_currency
        FROM symbols s
        JOIN LATERAL (
            SELECT price, currency
            FROM quote_history
            WHERE symbol_id = s.id
              AND created_at::date = CURRENT_DATE
            ORDER BY created_at DESC
            LIMIT 1
        ) qp_today ON TRUE
        JOIN LATERAL (
            SELECT price, currency
            FROM quote_history
            WHERE symbol_id = s.id
              AND created_at::date = (CURRENT_DATE - INTERVAL '1 day')
            ORDER BY created_at DESC
            LIMIT 1
        ) qp_yesterday ON TRUE
        WHERE s.ticker = %s
    """

    with db.cursor(cursor_factory=RealDictCursor) as cursor:
        cursor.execute(sql, (ticker,))
        result = cursor.fetchone()

    if not result:
        return None

    return StockQuote(
        ticker=ticker,
        current=result["price"],
        currency=result["currency"],
        previous_close=result["open_price"],
        previous_close_currency=result["open_currency"],
    )


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
