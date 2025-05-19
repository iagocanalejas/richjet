from dataclasses import dataclass
from enum import Enum


class AccountType(Enum):
    BROKER = "BROKER"
    BANK = "BANK"


@dataclass
class Account:
    user_id: int
    name: str
    account_type: AccountType
    id: int = 0

    @classmethod
    def from_dict(cls, **kwargs) -> "Account":
        item = cls(**{k: v for k, v in kwargs.items() if k in cls.__dataclass_fields__})
        if "account_type" in kwargs:
            item.account_type = AccountType(kwargs["account_type"])
        return item

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "account_type": self.account_type,
            "user_id": self.user_id,
        }


def get_accounts_by_user_id(db, user_id: int) -> list[Account]:
    """
    Retrieves accounts from the database by user ID.
    """
    assert user_id, "User ID cannot be None"

    with db.cursor() as cursor:
        cursor.execute(
            """
            SELECT id, name, account_type
            FROM accounts
            WHERE user_id = %s
            """,
            (user_id,),
        )
        result = cursor.fetchall()
        if not result:
            return []

        return [
            Account(
                id=row[0],
                user_id=user_id,
                name=row[1],
                account_type=row[2],
            )
            for row in result
        ]


def create_account(db, user_id: int, account: Account) -> Account:
    """
    Adds an account to the database.
    """
    assert user_id, "User ID cannot be None"
    assert account, "Account object cannot be None"
    assert account.name, "Account name cannot be None"
    assert account.account_type in [AccountType.BROKER, AccountType.BANK], "Unsupported account type"

    with db.cursor() as cursor:
        cursor.execute(
            """
            INSERT INTO accounts (user_id, name, account_type)
            VALUES (%s, %s, %s)
            RETURNING id
            """,
            (user_id, account.name, account.account_type.value),
        )
        result = cursor.fetchone()
        if not result:
            raise Exception("Failed to add account")

        account.id = result[0]
        db.commit()
    return account
