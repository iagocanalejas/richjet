from dataclasses import dataclass
from datetime import datetime
from enum import Enum

from fastapi import HTTPException
from log.errors import required_msg
from psycopg2.extensions import connection as Connection
from psycopg2.extras import RealDictCursor, RealDictRow

from models.account import Account, get_accounts_by_user
from models.rates import convert_to_currency
from models.session import Session
from models.symbol import Symbol
from models.user import User


class TransactionType(Enum):
    BUY = "BUY"
    SELL = "SELL"
    DIVIDEND = "DIVIDEND"
    DIVIDEND_CASH = "DIVIDEND-CASH"


@dataclass
class Transaction:
    user_id: str
    quantity: float
    price: float
    commission: float
    currency: str
    transaction_type: TransactionType
    date: str

    id: str = ""
    account_id: str | None = None
    account: Account | None = None
    symbol_id: str | None = None
    symbol: Symbol | None = None
    created_at: str | None = None

    @classmethod
    def from_row(cls, row: RealDictRow) -> "Transaction":
        return cls(
            id=row["transaction_id"] if "transaction_id" in row else row["id"],
            user_id=row["user_id"],
            account_id=row["account_id"],
            symbol_id=row["symbol_id"],
            account=Account.from_row(row) if row["account_id"] else None,
            quantity=row["quantity"],
            price=row["price"],
            commission=row["commission"],
            currency=row["transaction_currency"] if "transaction_currency" in row else row["currency"],
            transaction_type=TransactionType(row["transaction_type"]),
            date=row["date"],
            created_at=row["created_at"],
            symbol=Symbol.from_row(row),
        )

    @classmethod
    def from_dict(cls, **kwargs) -> "Transaction":
        item = cls(**{k: v for k, v in kwargs.items() if k in cls.__dataclass_fields__})
        if "transaction_type" in kwargs and kwargs["transaction_type"]:
            item.transaction_type = TransactionType(kwargs["transaction_type"])
        if "symbol" in kwargs and kwargs["symbol"]:
            item.symbol = Symbol.from_dict(**kwargs["symbol"])
        if "account" in kwargs and kwargs["account"]:
            item.account = Account.from_dict(**kwargs["account"])
        return item

    def to_dict(self) -> dict:
        if isinstance(self.created_at, datetime):
            self.created_at = self.created_at.isoformat()
        if isinstance(self.date, datetime):
            self.date = self.date.isoformat()
        assert self.symbol is not None, "Symbol must be set to convert to dict"
        return {
            "id": self.id,
            "user_id": self.user_id,
            "symbol": self.symbol.to_dict(),
            "account": self.account.to_dict() if self.account else None,
            "quantity": self.quantity,
            "price": self.price,
            "commission": self.commission,
            "currency": self.currency,
            "transaction_type": self.transaction_type.value,
            "date": self.date,
            "created_at": self.created_at,
        }


_TRANSACTION_SELECT = """
t.id, t.user_id, t.account_id, t.quantity, t.price, t.commission, t.currency, t.transaction_type, t.date, t.created_at,
s.id AS symbol_id, s.name, s.ticker, s.display_name, s.currency AS symbol_currency, s.source, s.isin, s.picture,
s.created_by, w.manual_price AS manual_price, TRUE AS is_favorite,
a.id AS account_id, a.name AS account_name, a.account_type, a.balance, a.currency as account_currency,
qp.price as symbol_price, qp.previous_close, qp.currency as symbol_currency
"""


async def get_transaction_by_id(db: Connection, session: Session, transaction_id: str) -> Transaction:
    if not transaction_id:
        raise HTTPException(status_code=400, detail=required_msg("transaction_id"))

    sql = f"""
        SELECT {_TRANSACTION_SELECT}
        FROM transactions t
        JOIN symbols s ON t.symbol_id = s.id
        JOIN watchlist w ON t.symbol_id = w.symbol_id AND t.user_id = w.user_id
        LEFT JOIN accounts a ON t.account_id = a.id
        LEFT JOIN LATERAL (
            SELECT price, previous_close, currency
            FROM quote_history
            WHERE symbol_id = s.id
              AND created_at::date = CURRENT_DATE
            ORDER BY created_at DESC
            LIMIT 1
        ) qp ON TRUE
        WHERE t.id = %s::uuid AND t.user_id = %s::uuid
    """

    with db.cursor(cursor_factory=RealDictCursor) as cursor:
        cursor.execute(sql, (transaction_id, session.user_id))
        row = cursor.fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Transaction not found")

    transaction = Transaction.from_row(row)
    assert transaction.symbol is not None
    if not transaction.symbol.is_manual_price:
        transaction.symbol.price, _ = await convert_to_currency(
            session,
            row.get("symbol_price", None),
            row.get("symbol_currency", None),
        )
        transaction.symbol.open_price, _ = await convert_to_currency(
            session,
            row.get("previous_close", None),
            row.get("symbol_currency", None),
        )
        transaction.symbol.currency = session.currency
    return transaction


async def get_transactions_by_user(db: Connection, session: Session) -> list[Transaction]:
    """
    Get all transactions for a user.
    """
    sql = f"""
        SELECT {_TRANSACTION_SELECT}
        FROM transactions t
        JOIN symbols s ON t.symbol_id = s.id
        JOIN watchlist w ON t.symbol_id = w.symbol_id AND t.user_id = w.user_id
        LEFT JOIN accounts a ON t.account_id = a.id
        LEFT JOIN LATERAL (
            SELECT price, previous_close, currency
            FROM quote_history
            WHERE symbol_id = s.id
              AND created_at::date = CURRENT_DATE
            ORDER BY created_at DESC
            LIMIT 1
        ) qp ON TRUE
        WHERE t.user_id = %s::uuid
        ORDER BY t.date DESC
    """

    with db.cursor(cursor_factory=RealDictCursor) as cursor:
        cursor.execute(sql, (session.user_id,))
        rows = cursor.fetchall()

    transactions = []
    for row in rows:
        transaction = Transaction.from_row(row)
        assert transaction.symbol is not None
        if not transaction.symbol.is_manual_price:
            transaction.symbol.price, _ = await convert_to_currency(
                session,
                row.get("symbol_price", None),
                row.get("symbol_currency", None),
            )
            transaction.symbol.open_price, _ = await convert_to_currency(
                session,
                row.get("previous_close", None),
                row.get("symbol_currency", None),
            )
            transaction.symbol.currency = session.currency
        transactions.append(transaction)
    return transactions


async def get_transactions_by_user_and_symbol_and_account(
    db: Connection,
    session: Session,
    symbol_id: str,
    account_id: str | None,
) -> list[Transaction]:
    """
    Get all transactions for a user in an account.
    """
    sql = f"""
        SELECT {_TRANSACTION_SELECT}
        FROM transactions t
        JOIN symbols s ON t.symbol_id = s.id
        JOIN watchlist w ON t.symbol_id = w.symbol_id AND t.user_id = w.user_id
        LEFT JOIN accounts a ON t.account_id = a.id
        LEFT JOIN LATERAL (
            SELECT price, previous_close, currency
            FROM quote_history
            WHERE symbol_id = s.id
              AND created_at::date = CURRENT_DATE
            ORDER BY created_at DESC
            LIMIT 1
        ) qp ON TRUE
        WHERE t.user_id = %s::uuid
            AND t.symbol_id = %s
            AND t.account_id IS NOT DISTINCT FROM %s::uuid
        ORDER BY t.date DESC
    """

    with db.cursor(cursor_factory=RealDictCursor) as cursor:
        cursor.execute(sql, (session.user_id, symbol_id, account_id))
        rows = cursor.fetchall()

    transactions = []
    for row in rows:
        transaction = Transaction.from_row(row)
        assert transaction.symbol is not None
        if not transaction.symbol.is_manual_price:
            transaction.symbol.price, _ = await convert_to_currency(
                session,
                row.get("symbol_price", None),
                row.get("symbol_currency", None),
            )
            transaction.symbol.open_price, _ = await convert_to_currency(
                session,
                row.get("previous_close", None),
                row.get("symbol_currency", None),
            )
            transaction.symbol.currency = session.currency
        transactions.append(transaction)
    return transactions


async def create_transaction(db: Connection, session: Session, transaction: Transaction) -> Transaction:
    """
    Creates a transaction in the database.
    """
    if not transaction.symbol_id:
        raise HTTPException(status_code=400, detail=required_msg("transaction.symbol_id"))

    if transaction.account_id:
        accounts = await get_accounts_by_user(db, session)
        if not any(a.id == transaction.account_id for a in accounts):
            msg = f"Account '{transaction.account_id}' not found for user '{session.user_id}'"
            raise HTTPException(status_code=400, detail=msg)

    await _validate_transaction_by_type(db, session, transaction)
    await _validate_sell_transaction(db, session, transaction)

    sql = """
        INSERT INTO transactions (
            user_id, symbol_id, account_id, quantity, price, commission, currency,
            transaction_type, date
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        RETURNING id
    """

    with db.cursor() as cursor:
        cursor.execute(
            sql,
            (
                session.user_id,
                transaction.symbol_id,
                transaction.account_id,
                transaction.quantity,
                transaction.price,
                transaction.commission,
                transaction.currency,
                transaction.transaction_type.value,
                transaction.date,
            ),
        )
        row = cursor.fetchone()

    if not row:
        raise HTTPException(status_code=500, detail="Failed to create transaction")

    transaction.id = row[0]
    db.commit()
    return transaction


async def update_transaction(db: Connection, session: Session, transaction: Transaction) -> Transaction:
    """
    Updates a transaction in the database.
    """
    if not transaction.id:
        raise HTTPException(status_code=400, detail=required_msg("transaction.id"))

    await _validate_transaction_by_type(db, session, transaction)
    await _validate_sell_transaction(db, session, transaction)

    sql = """
        UPDATE transactions
        SET quantity = %s, price = %s, commission = %s,
            account_id = CASE
                WHEN %s IS NULL THEN NULL
                ELSE (
                    SELECT id FROM accounts
                    WHERE id = %s::uuid AND user_id = %s::uuid
                )
        END
        WHERE id = %s::uuid AND user_id = %s::uuid
        RETURNING id
    """

    with db.cursor() as cursor:
        cursor.execute(
            sql,
            (
                transaction.quantity,
                transaction.price,
                transaction.commission,
                transaction.account_id,
                transaction.account_id,
                session.user_id,
                transaction.id,
                session.user_id,
            ),
        )
        row = cursor.fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Transaction not found")

    db.commit()
    return await get_transaction_by_id(db, session, row[0])


async def update_stock_account(
    db: Connection,
    session: Session,
    ticker: str,
    from_account_id: str | None,
    to_account_id: str | None,
) -> list[str]:
    """
    Updates the account for a transaction.
    """
    user_id = session.user.id if isinstance(session.user, User) else session.user
    if not user_id:
        raise HTTPException(status_code=400, detail=required_msg("user_id"))
    if not ticker:
        raise HTTPException(status_code=400, detail=required_msg("ticker"))
    if from_account_id == to_account_id:
        raise HTTPException(status_code=400, detail="from_account_id and to_account_id cannot be the same")

    valid_accounts = await get_accounts_by_user(db, session)
    if from_account_id is not None:
        if not any(a.id == from_account_id for a in valid_accounts):
            raise HTTPException(status_code=400, detail=f"Account '{from_account_id}' not found for user '{user_id}'")
    if to_account_id is not None:
        if not any(a.id == to_account_id for a in valid_accounts):
            raise HTTPException(status_code=400, detail=f"Account '{to_account_id}' not found for user '{user_id}'")

    account_sql = "account_id = %s::uuid AND" if from_account_id is not None else ""
    sql = f"""
        UPDATE transactions t
        SET account_id = %s::uuid
        WHERE user_id = %s::uuid AND
            {account_sql}
            (SELECT ticker FROM symbols WHERE id = t.symbol_id) = %s
        RETURNING id
    """

    with db.cursor() as cursor:
        params = (
            (to_account_id, user_id, from_account_id, ticker)
            if from_account_id is not None
            else (to_account_id, user_id, ticker)
        )
        cursor.execute(sql, params)
        rows = cursor.fetchall()

    db.commit()
    return [row[0] for row in rows]


def remove_transaction_by_id(db: Connection, session: Session, transaction_id: str) -> None:
    """
    Removes a transaction from the database.
    """
    user_id = session.user.id if isinstance(session.user, User) else session.user
    if not user_id:
        raise HTTPException(status_code=400, detail=required_msg("user_id"))
    if not transaction_id:
        raise HTTPException(status_code=400, detail=required_msg("transaction_id"))

    with db.cursor() as cursor:
        cursor.execute(
            """
            DELETE FROM transactions
            WHERE user_id = %s::uuid AND id = %s::uuid
            """,
            (user_id, transaction_id),
        )
        db.commit()


async def _validate_transaction_by_type(db: Connection, session: Session, transaction: Transaction) -> None:
    if transaction.transaction_type not in set(TransactionType):
        raise HTTPException(status_code=400, detail=f"Invalid transaction type: {transaction.transaction_type}")

    if transaction.transaction_type == TransactionType.DIVIDEND:
        if transaction.quantity <= 0:
            raise HTTPException(status_code=400, detail="Quantity must be greater than 0 for dividend transactions")
        transaction.price = 0.0  # Not applicable

    if transaction.transaction_type == TransactionType.DIVIDEND_CASH:
        if transaction.price <= 0:
            raise HTTPException(status_code=400, detail="Price must be greater than 0 for dividend cash transactions")
        transaction.quantity = 0  # Not applicable

    # check for at least one BUY transaction for the given symbol
    if transaction.transaction_type in {TransactionType.DIVIDEND, TransactionType.DIVIDEND_CASH}:
        transactions = await get_transactions_by_user(db, session)
        _has_buy_transaction = any(
            t.transaction_type == TransactionType.BUY
            and getattr(t.account, "id", None) == transaction.account_id
            and getattr(t.symbol, "id", None) == transaction.symbol_id
            for t in transactions
        )
        if not _has_buy_transaction:
            ticker = transaction.symbol.ticker if transaction.symbol else transaction.symbol_id
            raise HTTPException(status_code=400, detail=f"No BUY transaction found for symbol {ticker}")


async def _validate_sell_transaction(db: Connection, session: Session, transaction: Transaction) -> None:
    if transaction.transaction_type != TransactionType.SELL:
        return

    assert transaction.symbol_id is not None
    transactions = await get_transactions_by_user_and_symbol_and_account(
        db,
        session,
        symbol_id=transaction.symbol_id,
        account_id=transaction.account_id,
    )
    hoard_transactions = {TransactionType.BUY, TransactionType.SELL, TransactionType.DIVIDEND}
    transactions = [t for t in transactions if t.transaction_type in hoard_transactions]
    transactions.reverse()
    if transaction.id:  # if we are updating an existing transaction, exclude it from the check
        idx = next(i for i, t in enumerate(transactions) if t.id == transaction.id)
        transactions = transactions[:idx]
    remaining = sum(-t.quantity if t.transaction_type == TransactionType.SELL else t.quantity for t in transactions)
    if float(remaining) < transaction.quantity:
        msg = f"Not enough shares to sell. Available: {remaining}, Trying to sell: {transaction.quantity}"
        raise HTTPException(status_code=400, detail=msg)
