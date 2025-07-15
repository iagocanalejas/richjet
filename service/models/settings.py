from dataclasses import dataclass

import stripe
from fastapi import HTTPException
from log.errors import required_msg
from psycopg2.extensions import connection as Connection
from psycopg2.extras import RealDictCursor


@dataclass
class UserSettings:
    user_id: str
    currency: str
    subscription: stripe.Subscription | None = None
    limits: dict[str, int] | None = None

    @classmethod
    def from_dict(cls, **kwargs) -> "UserSettings":
        return cls(**{k: v for k, v in kwargs.items() if k in cls.__dataclass_fields__})

    def to_dict(self) -> dict:
        return {
            "user_id": self.user_id,
            "currency": self.currency,
            "subscription": self.subscription,
            "limits": self.limits,
        }


def get_user_settings(db: Connection, user_id: str) -> UserSettings:
    """
    Retrieves user settings from the database by user ID.
    """
    if not user_id:
        raise HTTPException(status_code=400, detail=required_msg("user_id"))

    sql = """
        SELECT id, currency
        FROM users
        WHERE id = %s::uuid
    """

    with db.cursor(cursor_factory=RealDictCursor) as cursor:
        cursor.execute(sql, (user_id,))
        row = cursor.fetchone()

    if not row:
        raise HTTPException(status_code=404, detail=f"User settings not found for user ID {user_id}")

    return UserSettings(
        user_id=row["id"],
        currency=row["currency"],
    )


def update_user_settings(db: Connection, user_settings: UserSettings) -> None:
    """
    Updates user settings in the database.
    """
    if not user_settings.user_id:
        raise HTTPException(status_code=400, detail=required_msg("user_id"))
    if user_settings.currency not in {"USD", "EUR", "GBP"}:
        raise HTTPException(status_code=400, detail="Invalid currency")

    sql = """
        UPDATE users
        SET currency = %s
        WHERE id = %s::uuid
    """

    with db.cursor() as cursor:
        cursor.execute(sql, (user_settings.currency, user_settings.user_id))
        db.commit()
