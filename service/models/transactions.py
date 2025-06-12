from dataclasses import dataclass
from datetime import datetime
from enum import Enum

from psycopg2.extensions import connection as Connection

from models.account import Account, AccountType, get_accounts_by_user_id
from models.symbol import MarketSector, SecurityType, Symbol


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


def get_transactions_by_user_id(db: Connection, user_id: str) -> list[Transaction]:
    """
    Get all transactions for a user.
    """
    with db.cursor() as cursor:
        cursor.execute(
            """
            SELECT t.id, t.user_id, t.account_id, t.quantity, t.price, t.commission, t.currency, t.transaction_type,
                    t.date, t.created_at, s.id, s.name, s.ticker, s.currency, s.source, s.security_type,
                    s.market_sector, s.isin, s.figi, s.picture, a.id, a.name, a.account_type
            FROM transactions t JOIN symbols s ON t.symbol_id = s.id LEFT JOIN accounts a ON t.account_id = a.id
            WHERE t.user_id = %s
            """,
            (user_id,),
        )
        result = cursor.fetchall()
        if not result:
            return []
        return [
            Transaction(
                id=row[0],
                user_id=user_id,
                account=Account(
                    id=row[20],
                    user_id=user_id,
                    name=row[21],
                    account_type=AccountType(row[22]),
                )
                if row[20]
                else None,
                quantity=row[3],
                price=row[4],
                commission=row[5],
                currency=row[6],
                transaction_type=TransactionType(row[7]),
                date=row[8],
                created_at=row[9],
                symbol=Symbol(
                    id=row[10],
                    name=row[11],
                    ticker=row[12],
                    currency=row[13],
                    source=row[14],
                    security_type=SecurityType(row[15]),
                    market_sector=MarketSector(row[16]) if row[16] else None,
                    isin=row[17],
                    figi=row[18],
                    picture=row[19],
                ),
            )
            for row in result
        ]


def _has_buy_transaction(transactions: list[Transaction], symbol_id: str) -> bool:
    return any(t.transaction_type == TransactionType.BUY and t.symbol.id == symbol_id for t in transactions)


def create_transaction(db: Connection, user_id: str, transaction: Transaction) -> Transaction:
    """
    Creates a transaction in the database.
    """
    assert transaction, "Transaction object cannot be None"
    assert transaction.symbol_id, "Symbol cannot be None"
    assert transaction.transaction_type in {
        TransactionType.BUY,
        TransactionType.SELL,
        TransactionType.DIVIDEND,
        TransactionType.DIVIDEND_CASH,
    }, "Invalid transaction type"

    if transaction.transaction_type == TransactionType.DIVIDEND:
        assert transaction.quantity > 0, "Quantity must be greater than 0 for dividend transactions"
        transaction.price = 0.0  # Price is not applicable for dividend transactions
    elif transaction.transaction_type == TransactionType.DIVIDEND_CASH:
        assert transaction.price > 0, "Price must be greater than 0 for dividend cash transactions"
        transaction.quantity = 0  # Quantity is not applicable for dividend cash transactions

    if transaction.transaction_type in {TransactionType.DIVIDEND, TransactionType.DIVIDEND_CASH}:
        transactions = get_transactions_by_user_id(db, user_id)
        assert _has_buy_transaction(transactions, transaction.symbol_id), (
            f"Cannot create dividend transaction for symbol {transaction.symbol.ticker} "
            "without a corresponding buy transaction"
        )

    with db.cursor() as cursor:
        cursor.execute(
            """
            INSERT INTO transactions (user_id, symbol_id, account_id, quantity, price, commission, currency,
                                      transaction_type, date)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
            """,
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
        result = cursor.fetchone()
        if not result:
            raise Exception("Failed to create transaction")
        db.commit()
        transaction.id = result[0]
        return transaction


def update_transaction_account(
    db: Connection,
    user_id: str,
    transaction_id: str,
    account_id: str | None,
) -> Transaction:
    """
    Updates the account for a transaction.
    """
    assert user_id, "User ID cannot be None"
    assert transaction_id, "Transaction ID cannot be None"

    if account_id is not None:
        valid_accounts = get_accounts_by_user_id(db, user_id)
        assert any(a.id == account_id for a in valid_accounts), "Invalid account ID"

    with db.cursor() as cursor:
        cursor.execute(
            """
            UPDATE transactions
            SET account_id = %s
            WHERE user_id = %s AND id = %s
            RETURNING id
            """,
            (account_id, user_id, transaction_id),
        )
        result = cursor.fetchone()
        if not result:
            raise Exception("Failed to update transaction")
        db.commit()
        return next(t for t in get_transactions_by_user_id(db, user_id) if t.id == result[0])


def remove_transaction_by_id(db: Connection, user_id: str, transaction_id: str) -> None:
    """
    Removes a transaction from the database.
    """
    assert user_id, "User ID cannot be None"
    assert transaction_id, "Transaction ID cannot be None"

    with db.cursor() as cursor:
        cursor.execute(
            """
            DELETE FROM transactions
            WHERE user_id = %s AND id = %s
            """,
            (user_id, transaction_id),
        )
        db.commit()
