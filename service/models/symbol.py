import re
from dataclasses import dataclass

from fastapi import HTTPException
from log.errors import required_msg
from psycopg2.extensions import connection as Connection
from psycopg2.extras import RealDictCursor, RealDictRow


@dataclass
class Symbol:
    ticker: str
    display_name: str
    name: str
    source: str
    currency: str
    id: str = ""
    isin: str | None = None
    picture: str | None = None
    price: float | None = None
    open_price: float | None = None
    is_user_created: bool = False
    is_manual_price: bool = False
    is_favorite: bool = False

    def __eq__(self, value: object, /) -> bool:
        return isinstance(value, Symbol) and self.ticker == value.ticker

    def __hash__(self) -> int:
        return hash(self.ticker)

    def merge(self, other: "Symbol") -> "Symbol":
        return Symbol(
            ticker=self.ticker or other.ticker,
            display_name=self.display_name or other.display_name,
            name=self.name or other.name,
            source=self.source or other.source,
            id=self.id,
            isin=self.isin or other.isin,
            currency=self.currency or other.currency,
            picture=self.picture or other.picture,
            price=self.price or other.price,
            open_price=self.open_price or other.open_price,
            is_user_created=self.is_user_created or other.is_user_created,
            is_manual_price=self.is_manual_price or other.is_manual_price,
            is_favorite=self.is_favorite or other.is_favorite,
        )

    @classmethod
    def from_row(cls, row: RealDictRow) -> "Symbol":
        return cls(
            ticker=row["ticker"],
            display_name=row["display_name"],
            name=row["name"],
            source=row["source"],
            id=row["symbol_id"] if "symbol_id" in row else row["id"],
            isin=row["isin"],
            currency=row["symbol_currency"] if "symbol_currency" in row else row["currency"],
            picture=row["picture"],
            price=row.get("manual_price", None),
            is_user_created=row["user_created"],
            is_manual_price=bool(row.get("manual_price", False)),
            is_favorite=row.get("is_favorite", False),
        )

    @classmethod
    def from_dict(cls, **kwargs) -> "Symbol":
        if "display_name" not in kwargs or not kwargs["display_name"]:
            kwargs["display_name"] = kwargs.get("name")
        return cls(**{k: v for k, v in kwargs.items() if k in cls.__dataclass_fields__})

    def to_dict(self) -> dict:
        return {
            "ticker": self.ticker,
            "display_name": self.display_name,
            "name": self.name,
            "source": self.source,
            "id": self.id,
            "isin": self.isin,
            "currency": self.currency,
            "picture": self.picture,
            "price": self.price,
            "open_price": self.open_price,
            "is_user_created": self.is_user_created,
            "is_manual_price": self.is_manual_price,
            "is_favorite": self.is_favorite,
        }


def is_supported_ticker(ticker: str) -> bool:
    """
    Checks if the ticker is supported by the system.
    """
    if not ticker:
        return False
    ticker = ticker.strip().upper()

    is_supported = "." not in ticker[1:]
    is_supported &= not re.search(r"^-?\d+X SHORT\b", ticker)
    is_supported &= not re.search(r"^-?\d+X LONG\b", ticker)
    is_supported &= not re.search(r"^LS \d+X\b", ticker)

    return is_supported


def search_symbol(db: Connection, query: str) -> list[Symbol]:
    like_query = f"%{query}%"
    sql = """
        SELECT id, ticker, display_name, name, source, isin, currency, picture, user_created
        FROM symbols
        WHERE NOT user_created AND (
            ticker ILIKE %s OR
            name ILIKE %s OR
            isin ILIKE %s
        )
    """

    with db.cursor(cursor_factory=RealDictCursor) as cursor:
        cursor.execute(sql, (like_query,) * 3)
        rows = cursor.fetchall()

    return [Symbol.from_row(row) for row in rows]


def get_symbol_by_ticker(db: Connection, ticker: str) -> Symbol:
    """
    Gets a symbol by its ticker from the database.
    """
    if not ticker:
        raise HTTPException(status_code=400, detail=required_msg("ticker"))

    sql = """
        SELECT id, ticker, display_name, name, source, isin, currency, picture, user_created
        FROM symbols
        WHERE NOT user_created AND ticker = %s
    """

    with db.cursor(cursor_factory=RealDictCursor) as cursor:
        cursor.execute(sql, (ticker,))
        result = cursor.fetchone()

    if not result:
        raise HTTPException(status_code=404, detail=f"Symbol {ticker} not found")

    return Symbol.from_row(result)


def create_symbol(db: Connection, symbol: Symbol) -> Symbol:
    """
    Creates a symbol in the database.
    """
    if not symbol.ticker:
        raise HTTPException(status_code=400, detail=required_msg("symbol.ticker"))
    if not symbol.name:
        raise HTTPException(status_code=400, detail=required_msg("symbol.name"))
    if not symbol.currency:
        raise HTTPException(status_code=400, detail=required_msg("symbol.currency"))
    if not symbol.source:
        raise HTTPException(status_code=400, detail=required_msg("symbol.source"))

    sql = """
        INSERT INTO symbols (ticker, name, currency, source, isin, picture, user_created)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        RETURNING id
    """

    with db.cursor() as cursor:
        cursor.execute(
            sql,
            (
                symbol.ticker,
                symbol.name,
                symbol.currency,
                symbol.source,
                symbol.isin,
                symbol.picture,
                symbol.is_user_created,
            ),
        )
        row = cursor.fetchone()

    if not row:
        raise HTTPException(status_code=500, detail="Failed to create symbol")

    symbol.id = row[0]
    db.commit()
    return symbol
