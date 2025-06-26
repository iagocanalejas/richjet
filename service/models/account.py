from dataclasses import dataclass
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

    @classmethod
    def from_row(cls, row: RealDictRow) -> "Account":
        return cls(
            id=row["id"],
            user_id=row["user_id"],
            name=row["name"],
            account_type=AccountType(row["account_type"]),
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
            "user_id": self.user_id,
        }


def get_accounts_by_user_id(db: Connection, user_id: str) -> list[Account]:
    """
    Retrieves accounts from the database by user ID.
    """
    if not user_id:
        raise HTTPException(status_code=400, detail=required_msg("user_id"))

    sql = """
        SELECT id, name, account_type
        FROM accounts
        WHERE user_id = %s::uuid
    """

    with db.cursor(cursor_factory=RealDictCursor) as cursor:
        cursor.execute(sql, (user_id,))
        rows = cursor.fetchall()

    if not rows:
        return []

    return [
        Account(
            id=row["id"],
            user_id=user_id,
            name=row["name"],
            account_type=row["account_type"],
        )
        for row in rows
    ]


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
        INSERT INTO accounts (user_id, name, account_type)
        VALUES (%s, %s, %s)
        RETURNING id
    """

    with db.cursor() as cursor:
        cursor.execute(sql, (user_id, account.name, account.account_type.value))
        row = cursor.fetchone()

    if not row:
        raise HTTPException(status_code=500, detail="failed to create account")

    account.id = row[0]
    db.commit()
    return account
