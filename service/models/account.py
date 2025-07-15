from dataclasses import dataclass, field
from enum import Enum

from fastapi import HTTPException
from log.errors import required_msg
from psycopg2.extensions import connection as Connection
from psycopg2.extras import RealDictCursor, RealDictRow


class AccountType(Enum):
    BROKER = "BROKER"
    BANK = "BANK"


@dataclass
class Account:
    user_id: str
    name: str
    account_type: AccountType
    id: str = ""
    currency: str = "USD"
    balance: float | None = None
    balance_history: list[dict] = field(default_factory=list)

    @classmethod
    def from_row(cls, row: RealDictRow) -> "Account":
        return cls(
            id=row["account_id"] if "account_id" in row else row["id"],
            user_id=row["user_id"],
            name=row["name"],
            account_type=AccountType(row["account_type"]),
            currency=row["currency"],
            balance=row.get("balance", None),
            balance_history=row.get("balance_history", []),
        )

    @classmethod
    def from_dict(cls, **kwargs) -> "Account":
        item = cls(**{k: v for k, v in kwargs.items() if k in cls.__dataclass_fields__})
        if "account_type" in kwargs and kwargs["account_type"]:
            item.account_type = AccountType(kwargs["account_type"])
        return item

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "account_type": self.account_type,
            "currency": self.currency,
            "user_id": self.user_id,
            "balance": self.balance,
            "balance_history": self.balance_history,
        }


def get_account_by_id(db: Connection, user_id: str, account_id: str) -> Account:
    """
    Retrieves an account from the database by user ID and account ID.
    """
    if not user_id:
        raise HTTPException(status_code=400, detail=required_msg("user_id"))
    if not account_id:
        raise HTTPException(status_code=400, detail=required_msg("account_id"))

    sql = """
        SELECT a.id, user_id, name, account_type, a.balance, currency,
            COALESCE(
                json_agg(ab ORDER BY ab.updated_at DESC) FILTER (WHERE ab.id IS NOT NULL),
                '[]'
            ) AS balance_history
        FROM accounts a
        LEFT JOIN account_balances ab ON a.id = ab.account_id
        WHERE a.id = %s::uuid AND user_id = %s::uuid
        GROUP BY a.id
        ORDER BY MIN(a.created_at);
    """

    with db.cursor(cursor_factory=RealDictCursor) as cursor:
        cursor.execute(sql, (account_id, user_id))
        row = cursor.fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Account not found")

    return Account.from_row(row)


def get_accounts_by_user_id(db: Connection, user_id: str) -> list[Account]:
    """
    Retrieves accounts from the database by user ID.
    """
    if not user_id:
        raise HTTPException(status_code=400, detail=required_msg("user_id"))

    sql = """
        SELECT a.id, user_id, name, account_type, a.balance, currency,
            COALESCE(
                json_agg(ab ORDER BY ab.updated_at DESC) FILTER (WHERE ab.id IS NOT NULL),
                '[]'
            ) AS balance_history
        FROM accounts a
        LEFT JOIN account_balances ab ON a.id = ab.account_id
        WHERE a.user_id = %s::uuid
        GROUP BY a.id
        ORDER BY MIN(a.created_at);
    """

    with db.cursor(cursor_factory=RealDictCursor) as cursor:
        cursor.execute(sql, (user_id,))
        rows = cursor.fetchall()

    if not rows:
        return []

    return [Account.from_row(row) for row in rows]


def create_account(db: Connection, user_id: str, account: Account) -> Account:
    """
    Adds an account to the database.
    """
    if not user_id:
        raise HTTPException(status_code=400, detail=required_msg("user_id"))

    if not account.name:
        raise HTTPException(status_code=400, detail=required_msg("account.name"))

    if account.account_type not in [AccountType.BROKER, AccountType.BANK]:
        raise HTTPException(status_code=400, detail=f"invalid account type: {account.account_type}")

    sql = """
        INSERT INTO accounts (user_id, name, account_type, balance, currency)
        VALUES (%s, %s, %s, %s, (SELECT currency FROM users WHERE id = %s::uuid))
        RETURNING id
    """

    balance = 0.0 if account.account_type == AccountType.BANK else None
    with db.cursor() as cursor:
        cursor.execute(sql, (user_id, account.name, account.account_type.value, balance, user_id))

        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=500, detail="failed to create account")

        if account.account_type == AccountType.BANK and balance is not None:
            _update_balance_history(db, row[0], balance)

    account.id = row[0]
    db.commit()
    return account


def update_account(db: Connection, user_id: str, account: Account, account_id: str) -> Account:
    """
    Updates an existing account in the database.
    """
    if not user_id:
        raise HTTPException(status_code=400, detail=required_msg("user_id"))

    if not account_id:
        raise HTTPException(status_code=400, detail=required_msg("account_id"))

    if account.balance and account.balance < 0:
        raise HTTPException(status_code=400, detail="balance cannot be negative")

    if not account.account_type == AccountType.BANK:
        raise HTTPException(status_code=400, detail=f"invalid account type: {account.account_type}")

    sql = """
        UPDATE accounts
        SET balance = %s
        WHERE id = %s::uuid AND user_id = %s::uuid
        RETURNING id
    """

    with db.cursor() as cursor:
        cursor.execute(sql, (account.balance, account_id, user_id))

        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Account not found or does not belong to the user")

        if account.balance is not None:
            _update_balance_history(db, row[0], account.balance)

    db.commit()
    return get_account_by_id(db, user_id, account_id)


def remove_account_by_id(db: Connection, user_id: str, account_id: str) -> None:
    """
    Removes an account from the database by its ID.
    """
    if not user_id:
        raise HTTPException(status_code=400, detail=required_msg("user_id"))

    if not account_id:
        raise HTTPException(status_code=400, detail=required_msg("account_id"))

    check_sql = """
        SELECT count(*) FROM transactions
        WHERE account_id = %s::uuid
    """

    delete_sql = """
        DELETE FROM accounts
        WHERE id = %s::uuid AND user_id = %s::uuid
    """

    with db.cursor() as cursor:
        cursor.execute(check_sql, (account_id,))
        result = cursor.fetchone()
        if not result or result[0] > 0:
            raise HTTPException(status_code=400, detail="Cannot delete account with existing transactions")
        cursor.execute(delete_sql, (account_id, user_id))

    db.commit()


def _update_balance_history(db: Connection, account_id: str, balance: float) -> None:
    """
    Updates the balance history for an account.
    """
    sql = """
        INSERT INTO account_balances (account_id, balance)
        VALUES (%s::uuid, %s)
    """
    with db.cursor() as cursor:
        cursor.execute(sql, (account_id, balance))
