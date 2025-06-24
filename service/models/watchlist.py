from dataclasses import dataclass

from psycopg2.extensions import connection as Connection

from .symbol import MarketSector, SecurityType, Symbol, create_symbol, get_symbol_by_ticker


@dataclass
class WatchlistItem:
    user_id: str
    symbol: Symbol
    id: str = ""

    @classmethod
    def from_dict(cls, **kwargs) -> "WatchlistItem":
        item = cls(**{k: v for k, v in kwargs.items() if k in cls.__dataclass_fields__})
        if "symbol" in kwargs and kwargs["symbol"]:
            item.symbol = Symbol.from_dict(**kwargs["symbol"])
        return item

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "symbol": self.symbol.to_dict(),
        }


def get_watchlist_by_user_id(db: Connection, user_id: str) -> list[Symbol]:
    """
    Retrieves a watchlist from the database by user ID.
    """
    assert user_id, "User ID cannot be None"

    with db.cursor() as cursor:
        cursor.execute(
            """
            SELECT s.id, s.ticker, s.name, s.currency, s.source, s.security_type, s.market_sector,
                    s.isin, s.figi, s.picture, w.manual_price, s.user_created
            FROM watchlist w JOIN symbols s ON w.symbol_id = s.id
            WHERE w.user_id = %s::uuid
            """,
            (user_id,),
        )
        result = cursor.fetchall()
        if not result:
            return []

        return [
            Symbol(
                id=row[0],
                ticker=row[1],
                name=row[2],
                currency=row[3],
                source=row[4],
                security_type=SecurityType(row[5]),
                market_sector=MarketSector(row[6]) if row[6] else None,
                isin=row[7],
                figi=row[8],
                picture=row[9],
                manual_price=row[10],
                is_user_created=row[11],
            )
            for row in result
        ]


def create_watchlist_item(db, user_id: str, symbol: Symbol) -> Symbol:
    """
    Adds a symbol to the watchlist in the database.
    """
    assert user_id, "User ID cannot be None"
    assert symbol, "Symbol object cannot be None"

    db_symbol = get_symbol_by_ticker(db, symbol.ticker)
    symbol = db_symbol if db_symbol else create_symbol(db, symbol)
    assert symbol.id, "Symbol ID cannot be None"

    with db.cursor() as cursor:
        cursor.execute(
            """
            INSERT INTO watchlist (user_id, symbol_id)
            VALUES (%s, %s)
            RETURNING id
            """,
            (user_id, symbol.id),
        )
        result = cursor.fetchone()
        if not result:
            raise Exception("Failed to add watchlist item")

        db.commit()
        return symbol


def update_watchlist_item(db, user_id: str, symbol_id: str, new_price: float | None) -> Symbol:
    """
    Updates the price of a watchlist item in the database.
    """
    assert user_id, "User ID cannot be None"
    assert symbol_id, "Symbol ID cannot be None"

    with db.cursor() as cursor:
        cursor.execute(
            """
            UPDATE watchlist w
            SET manual_price = %s
            FROM symbols s
            WHERE w.symbol_id = s.id AND w.user_id = %s::uuid AND s.id = %s::uuid
            RETURNING s.id
            """,
            (new_price, user_id, symbol_id),
        )
        result = cursor.fetchone()
        if not result:
            raise Exception("Failed to update watchlist item")

        db.commit()
        return next(w for w in get_watchlist_by_user_id(db, user_id) if w.id == result[0])


def remove_watchlist_item(db, user_id: str, symbol_id: str) -> None:
    """
    Removes a symbol from the watchlist in the database.
    """
    assert user_id, "User ID cannot be None"
    assert symbol_id, "Symbol ID cannot be None"

    with db.cursor() as cursor:
        cursor.execute(
            """
            DELETE FROM watchlist
            WHERE user_id = %s::uuid AND symbol_id = %s::uuid
            """,
            (user_id, symbol_id),
        )
        cursor.execute(
            """
            DELETE FROM symbols
            WHERE id = %s::uuid AND user_created AND NOT EXISTS(SELECT 1 FROM watchlist WHERE symbol_id = %s::uuid)
            """,
            (symbol_id, symbol_id),
        )
        db.commit()
