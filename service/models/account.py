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
            name=row["account_name"] if "account_name" in row else row["name"],
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


def remove_account_by_id(db: Connection, user_id: str, account_id: str, forced: bool = False) -> None:
    """
    Removes an account from the database by its ID.
    """
    if not user_id:
        raise HTTPException(status_code=400, detail=required_msg("user_id"))

    if not account_id:
        raise HTTPException(status_code=400, detail=required_msg("account_id"))

    if forced:
        _remove_account_forced(db, user_id, account_id)
        db.commit()
        return

    sql = """
        WITH checks AS (
            SELECT
                (SELECT COUNT(*) FROM transactions WHERE account_id = %s::uuid) AS tx_count,
                (SELECT COUNT(*) FROM account_balances WHERE account_id = %s::uuid) AS ab_count
        )
        DELETE FROM accounts
        WHERE id = %s::uuid
          AND user_id = %s::uuid
          AND (SELECT tx_count FROM checks) = 0
          AND (SELECT ab_count FROM checks) = 0
        RETURNING id;
    """

    with db.cursor() as cursor:
        cursor.execute(sql, (account_id, account_id, account_id, user_id))
        deleted = cursor.fetchone()
        if not deleted:
            raise HTTPException(status_code=400, detail="Cannot delete account with existing transactions or balances")
        db.commit()


def remove_account_balance_by_id(db: Connection, user_id: str, account_id: str, balance_id: str) -> Account:
    """
    Removes a specific balance entry from an account.
    """
    if not user_id:
        raise HTTPException(status_code=400, detail=required_msg("user_id"))

    if not account_id:
        raise HTTPException(status_code=400, detail=required_msg("account_id"))

    if not balance_id:
        raise HTTPException(status_code=400, detail=required_msg("balance_id"))

    check_sql = """
        SELECT id, balance FROM account_balances
        WHERE account_id = %s::uuid
        ORDER BY updated_at ASC
    """

    sql = """
        DELETE FROM account_balances
        WHERE id = %s::uuid AND account_id = %s::uuid AND account_id IN (
            SELECT id FROM accounts WHERE user_id = %s::uuid
        )
        RETURNING id;
    """

    with db.cursor() as cursor:
        cursor.execute(check_sql, (account_id,))
        all_balances = [(row[0], row[1]) for row in cursor.fetchall()]

        if not all_balances:
            return get_account_by_id(db, user_id, account_id)

        # can't delete the first balance entry if there are others
        if len(all_balances) > 1 and all_balances[0][0] == balance_id:
            raise HTTPException(status_code=400, detail="Cannot delete the first balance entry while others exist")

        # if we delete the last balance entry, we need to update the account balance
        if all_balances[len(all_balances) - 1][0] == balance_id:
            new_balance = all_balances[len(all_balances) - 2][1]
            update_sql = """
                UPDATE accounts
                SET balance = %s
                WHERE id = %s::uuid AND user_id = %s::uuid
            """
            cursor.execute(update_sql, (new_balance, account_id, user_id))

        cursor.execute(sql, (balance_id, account_id, user_id))
        deleted = cursor.fetchone()
        if not deleted:
            raise HTTPException(status_code=404, detail="Balance entry not found or does not belong to the user")
        db.commit()
    return get_account_by_id(db, user_id, account_id)


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


def _remove_account_forced(db: Connection, user_id: str, account_id: str) -> None:
    """
    Forcefully removes an account and all its balances and transactions.
    """
    if not user_id:
        raise HTTPException(status_code=400, detail=required_msg("user_id"))

    if not account_id:
        raise HTTPException(status_code=400, detail=required_msg("account_id"))

    sql = """
        WITH deleted_transactions AS (
            DELETE FROM transactions WHERE account_id = %s::uuid AND user_id = %s::uuid
        ),
        deleted_balances AS (
            DELETE FROM account_balances WHERE account_id = %s::uuid
        ),
        deleted_account AS (
            DELETE FROM accounts
            WHERE id = %s::uuid AND user_id = %s::uuid
            RETURNING id
        )
        SELECT id FROM deleted_account;
    """

    with db.cursor() as cursor:
        cursor.execute(sql, (account_id, user_id, account_id, account_id, user_id))
        deleted = cursor.fetchone()
        if not deleted:
            raise HTTPException(status_code=404, detail="Account not found or does not belong to the user")
        db.commit()
