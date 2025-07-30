from dataclasses import dataclass
from enum import Enum

from db import get_db
from fastapi import Depends, HTTPException
from psycopg2.extensions import connection as Connection
from routers.auth import get_session

from models.user import User


class Plan(str, Enum):
    FREE = "FREE"
    LITE = "LITE"
    PRO = "PRO"
    MAX = "MAX"
    ADMIN = "ADMIN"


class LimitAction(str, Enum):
    CREATE_TRANSACTION = "create_transaction"
    CREATE_ACCOUNT = "create_account"
    ADD_SHARE = "add_share"


PLAN_DEFAULTS = {
    Plan.FREE: {
        "max_accounts": 1,
        "max_shares": 10,
        "max_transactions": 100,
    },
    Plan.LITE: {
        "max_accounts": 1,
        "max_shares": 50,
        "max_transactions": 500,
    },
    Plan.PRO: {
        "max_accounts": 5,
        "max_shares": 100,
        "max_transactions": 1000,
    },
    Plan.MAX: {
        "max_accounts": float("inf"),
        "max_shares": float("inf"),
        "max_transactions": float("inf"),
    },
    Plan.ADMIN: {
        "max_accounts": float("inf"),
        "max_shares": float("inf"),
        "max_transactions": float("inf"),
    },
}


@dataclass
class UserLimits:
    user: User

    @classmethod
    def get_user_limits(cls, user: User) -> dict[str, int]:
        plan = PLAN_DEFAULTS.get(Plan(user.plan), {})
        for key in plan.keys():
            if plan[key] == float("inf"):
                plan[key] = "Infinity"
        return plan

    def __post_init__(self):
        defaults = PLAN_DEFAULTS.get(Plan(self.user.plan), {})
        self.max_accounts = defaults.get("max_accounts", 0)
        self.max_shares = defaults.get("max_shares", 0)
        self.max_transactions = defaults.get("max_transactions", 0)

    def is_admin(self) -> bool:
        return self.user.plan == Plan.ADMIN

    def check(self, db: Connection, action: LimitAction) -> bool:
        if self.is_admin():
            return True

        match action:
            case LimitAction.CREATE_ACCOUNT:
                return self._check_limit(db, "accounts", self.max_accounts)
            case LimitAction.ADD_SHARE:
                return self._check_limit(db, "watchlist", self.max_shares)
            case LimitAction.CREATE_TRANSACTION:
                return self._check_limit(db, "transactions", self.max_transactions)
            case _:
                raise ValueError(f"Unsupported limit action: {action}")

    def _check_limit(self, db: Connection, table: str, max_count: int) -> bool:
        if max_count == 0:
            return False

        sql = f"SELECT COUNT(*) FROM {table} WHERE user_id = %s"
        with db.cursor() as cursor:
            cursor.execute(sql, (self.user.id,))
            result = cursor.fetchone()
            return result is not None and result[0] < max_count


def enforce_limit(action: LimitAction):
    def dependency(
        db: Connection = Depends(get_db),
        session=Depends(get_session),
    ):
        limits = UserLimits(user=session.user)
        if not limits.check(db, action):
            raise HTTPException(
                status_code=403,
                detail=f"{action.value.replace('_', ' ').capitalize()} limit reached. Upgrade your plan.",
            )

    return Depends(dependency)
