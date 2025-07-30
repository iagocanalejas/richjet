from dataclasses import dataclass
from datetime import datetime
from enum import Enum

from fastapi import HTTPException
from log.errors import required_msg
from psycopg2.extensions import connection as Connection
from psycopg2.extras import RealDictCursor, RealDictRow

from models.account import Account, get_accounts_by_user_id
from models.symbol import Symbol


class TransactionType(Enum):
    BUY = "BUY"
    SELL = "SELL"
    DIVIDEND = "DIVIDEND"
    DIVIDEND_CASH = "DIVIDEND-CASH"


@dataclass
class Transaction:
    user_id: str
    symbol: Symbol
    quantity: float
    price: float
    commission: float
    currency: str
    transaction_type: TransactionType
    date: str

    id: str = ""
    account: Account | None = None
    symbol_id: str | None = None
    account_id: str | None = None
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


def get_transaction_by_id(db: Connection, user_id: str, transaction_id: str) -> Transaction:
    if not user_id:
        raise HTTPException(status_code=400, detail=required_msg("user_id"))
    if not transaction_id:
        raise HTTPException(status_code=400, detail=required_msg("transaction_id"))

    sql = """
        SELECT t.id, t.user_id, t.account_id, t.quantity, t.price, t.commission, t.currency,
               t.transaction_type, t.date, t.created_at,
               s.id AS symbol_id, s.name, s.ticker, s.currency AS symbol_currency, s.source,
               s.security_type, s.market_sector, s.isin, s.figi, s.picture, s.user_created,
               a.id AS account_id, a.name, a.account_type, a.balance, a.currency
        FROM transactions t
        JOIN symbols s ON t.symbol_id = s.id
        LEFT JOIN accounts a ON t.account_id = a.id
        WHERE t.id = %s::uuid AND t.user_id = %s::uuid
    """

    with db.cursor(cursor_factory=RealDictCursor) as cursor:
        cursor.execute(sql, (transaction_id, user_id))
        result = cursor.fetchone()

    if not result:
        raise HTTPException(status_code=404, detail="Transaction not found")

    return Transaction.from_row(result)


def get_transactions_by_user_id(db: Connection, user_id: str) -> list[Transaction]:
    """
    Get all transactions for a user.
    """
    if not user_id:
        raise HTTPException(status_code=400, detail=required_msg("user_id"))

    sql = """
        SELECT t.id AS transaction_id, t.user_id, t.account_id, t.quantity, t.price, t.commission,
               t.currency AS transaction_currency, t.transaction_type, t.date, t.created_at,
               s.id AS symbol_id, s.name, s.ticker, s.currency AS symbol_currency,
               s.source, s.security_type, s.market_sector, s.isin, s.figi, s.picture,
               s.user_created, a.id AS account_id, a.name AS account_name, a.account_type, a.balance, a.currency,
               w.manual_price
        FROM transactions t
        JOIN symbols s ON t.symbol_id = s.id
        JOIN watchlist w ON t.symbol_id = w.symbol_id AND t.user_id = w.user_id
        LEFT JOIN accounts a ON t.account_id = a.id
        WHERE t.user_id = %s::uuid
        ORDER BY t.date DESC
    """

    with db.cursor(cursor_factory=RealDictCursor) as cursor:
        cursor.execute(sql, (user_id,))
        rows = cursor.fetchall()

    return [Transaction.from_row(row) for row in rows]


def create_transaction(db: Connection, user_id: str, transaction: Transaction) -> Transaction:
    """
    Creates a transaction in the database.
    """
    if not user_id:
        raise HTTPException(status_code=400, detail=required_msg("user_id"))
    if not transaction.symbol_id:
        raise HTTPException(status_code=400, detail=required_msg("transaction.symbol_id"))

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

    # Check for at least one BUY transaction for the given symbol
    if transaction.transaction_type in {TransactionType.DIVIDEND, TransactionType.DIVIDEND_CASH}:
        transactions = get_transactions_by_user_id(db, user_id)
        _has_buy_transaction = any(
            t.transaction_type == TransactionType.BUY and t.symbol.id == transaction.symbol_id for t in transactions
        )
        if not _has_buy_transaction:
            ticker = transaction.symbol.ticker if transaction.symbol else transaction.symbol_id
            raise HTTPException(status_code=400, detail=f"No BUY transaction found for symbol {ticker}")

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
                user_id,
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


def update_stock_account(
    db: Connection,
    user_id: str,
    ticker: str,
    from_account_id: str | None,
    to_account_id: str | None,
) -> list[str]:
    """
    Updates the account for a transaction.
    """
    if not user_id:
        raise HTTPException(status_code=400, detail=required_msg("user_id"))
    if not ticker:
        raise HTTPException(status_code=400, detail=required_msg("ticker"))
    if from_account_id == to_account_id:
        raise HTTPException(status_code=400, detail="from_account_id and to_account_id cannot be the same")

    valid_accounts = get_accounts_by_user_id(db, user_id)
    if from_account_id is not None:
        if not any(a.id == from_account_id for a in valid_accounts):
            raise HTTPException(status_code=400, detail=f"Account '{from_account_id}' not found for user '{user_id}'")
    if to_account_id is not None:
        if not any(a.id == to_account_id for a in valid_accounts):
            raise HTTPException(status_code=400, detail=f"Account '{to_account_id}' not found for user '{user_id}'")

    sql = """
        UPDATE transactions t
        SET account_id = %s::uuid
        WHERE user_id = %s::uuid AND
            account_id = %s::uuid AND
            (SELECT ticker FROM symbols WHERE id = t.symbol_id) = %s
        RETURNING id
    """

    with db.cursor() as cursor:
        cursor.execute(sql, (to_account_id, user_id, from_account_id, ticker))
        rows = cursor.fetchall()

    db.commit()
    return [row[0] for row in rows]


def remove_transaction_by_id(db: Connection, user_id: str, transaction_id: str) -> None:
    """
    Removes a transaction from the database.
    """
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
