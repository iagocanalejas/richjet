from fastapi import HTTPException
from log.errors import required_msg
from psycopg2.extensions import connection as Connection
from psycopg2.extras import RealDictCursor

from .symbol import Symbol, create_symbol, get_symbol_by_ticker

_WATCHLIST_SELECT = """
s.id AS symbol_id, w.user_id, s.ticker, s.display_name, s.name, s.currency, s.source, s.isin, s.picture,
w.manual_price AS manual_price, s.user_created, TRUE AS is_favorite
"""


def get_symbol_by_watchlist_id(db: Connection, user_id: str, watchlist_item_id: str) -> Symbol:
    """
    Retrieves a watchlist item from the database by user ID and watchlist item ID.
    """
    if not user_id:
        raise HTTPException(status_code=400, detail=required_msg("user_id"))
    if not watchlist_item_id:
        raise HTTPException(status_code=400, detail=required_msg("watchlist_item_id"))

    sql = f"""
        SELECT {_WATCHLIST_SELECT}
        FROM watchlist w
        JOIN symbols s ON w.symbol_id = s.id
        WHERE w.user_id = %s::uuid AND w.id = %s::uuid
    """

    with db.cursor(cursor_factory=RealDictCursor) as cursor:
        cursor.execute(sql, (user_id, watchlist_item_id))
        row = cursor.fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Watchlist item not found")

    return Symbol.from_row(row)


def get_watchlist_by_user(db: Connection, user_id: str) -> list[Symbol]:
    """
    Retrieves a watchlist from the database by user ID.
    """
    if not user_id:
        raise HTTPException(status_code=400, detail=required_msg("user_id"))

    sql = f"""
        SELECT {_WATCHLIST_SELECT}
        FROM watchlist w
        JOIN symbols s ON w.symbol_id = s.id
        WHERE w.user_id = %s::uuid
        ORDER BY s.display_name
    """

    with db.cursor(cursor_factory=RealDictCursor) as cursor:
        cursor.execute(sql, (user_id,))
        rows = cursor.fetchall()

    if not rows:
        return []

    return [Symbol.from_row(row) for row in rows]


def create_watchlist_item(db: Connection, user_id: str, symbol: Symbol) -> Symbol:
    """
    Adds a symbol to the watchlist in the database.
    """
    if not user_id:
        raise HTTPException(status_code=400, detail=required_msg("user_id"))
    if not symbol.ticker:
        raise HTTPException(status_code=400, detail=required_msg("symbol.ticker"))

    if not symbol.id:
        try:
            symbol = get_symbol_by_ticker(db, symbol.ticker)
        except HTTPException as e:
            if e.status_code != 404:
                raise e
            symbol = create_symbol(db, symbol)

    if not symbol.id:
        raise HTTPException(status_code=404, detail=f"Symbol {symbol.ticker} not found")

    sql = """
        INSERT INTO watchlist (user_id, symbol_id)
        VALUES (%s, %s)
        RETURNING id
    """

    with db.cursor() as cursor:
        cursor.execute(sql, (user_id, symbol.id))
        result = cursor.fetchone()

    if not result:
        raise HTTPException(status_code=500, detail="Failed to add symbol to watchlist")

    db.commit()
    return symbol


def update_watchlist_item(db: Connection, user_id: str, symbol_id: str, new_price: float | None) -> Symbol:
    """
    Updates the price of a watchlist item in the database.
    """
    if not user_id:
        raise HTTPException(status_code=400, detail=required_msg("user_id"))
    if not symbol_id:
        raise HTTPException(status_code=400, detail=required_msg("symbol_id"))

    sql = """
        UPDATE watchlist w
        SET manual_price = %s
        FROM symbols s
        WHERE w.symbol_id = s.id AND w.user_id = %s::uuid AND s.id = %s::uuid
        RETURNING w.id
    """

    with db.cursor() as cursor:
        cursor.execute(sql, (new_price, user_id, symbol_id))
        result = cursor.fetchone()

    if not result:
        raise HTTPException(status_code=500, detail="Failed to update watchlist item")

    db.commit()
    return get_symbol_by_watchlist_id(db, user_id, result[0])


def remove_watchlist_item(db: Connection, user_id: str, symbol_id: str) -> None:
    """
    Removes a symbol from the watchlist in the database.
    Also deletes user-created symbols if no longer referenced.
    """
    if not user_id:
        raise HTTPException(status_code=400, detail=required_msg("user_id"))
    if not symbol_id:
        raise HTTPException(status_code=400, detail=required_msg("symbol_id"))

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
            WHERE id = %s::uuid AND user_created AND NOT EXISTS (
                SELECT 1 FROM watchlist WHERE symbol_id = %s::uuid
            )
            """,
            (symbol_id, symbol_id),
        )
    db.commit()
