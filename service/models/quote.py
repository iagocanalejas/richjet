from dataclasses import dataclass

from fastapi import HTTPException
from psycopg2.extensions import connection as Connection
from psycopg2.extras import RealDictCursor, RealDictRow

from models.rates import convert_to_currency
from models.session import Session
from models.symbol import get_symbol_by_ticker


@dataclass
class StockQuote:
    ticker: str
    current: float | None = None
    currency: str | None = None
    previous_close: float | None = None

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
        )

    def to_dict(self) -> dict:
        assert self.current is not None, "currency is required"
        return {
            "ticker": self.ticker,
            "current": self.current,
            "previous_close": self.previous_close,
            "currency": self.currency,
        }


async def get_quote_point(db: Connection, session: Session, tickers: list[str]) -> list[StockQuote]:
    sql = """
        SELECT s.ticker, qp.price, qp.previous_close, qp.currency
        FROM symbols s
        LEFT JOIN LATERAL (
            SELECT price, previous_close, currency
            FROM quote_history
            WHERE symbol_id = s.id
              AND created_at::date = CURRENT_DATE
            ORDER BY created_at DESC
            LIMIT 1
        ) qp ON TRUE
        WHERE s.ticker = ANY(%s)
    """

    with db.cursor(cursor_factory=RealDictCursor) as cursor:
        cursor.execute(sql, (tickers,))
        results = cursor.fetchall()

    quotes = []
    for result in results:
        quote = StockQuote(
            ticker=result["ticker"],
            current=result["price"],
            currency=result["currency"],
            previous_close=result["previous_close"],
        )
        quote.current, _ = await convert_to_currency(session, quote.current, quote.currency)
        quote.previous_close, quote.currency = await convert_to_currency(session, quote.previous_close, quote.currency)
        quote.currency = session.currency
        quotes.append(quote)
    return quotes


def create_quote_history_point(db: Connection, quote: StockQuote) -> None:
    if not quote.ticker:
        raise HTTPException(status_code=400, detail="ticker is required")
    if not quote.current or quote.current <= 0:
        raise HTTPException(status_code=400, detail="invalid price")

    symbol = get_symbol_by_ticker(db, quote.ticker)

    sql = """
    INSERT INTO quote_history (symbol_id, price, previous_close, currency)
    VALUES (%s, %s, %s, %s)
    RETURNING id
    """

    with db.cursor() as cursor:
        cursor.execute(sql, (symbol.id, quote.current, quote.previous_close, quote.currency))
        row = cursor.fetchone()
    if not row:
        raise HTTPException(status_code=500, detail="failed to create quote point")
    db.commit()
