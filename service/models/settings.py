from dataclasses import dataclass

from fastapi import HTTPException
from psycopg2.extensions import connection as Connection


@dataclass
class UserSettings:
    user_id: int
    currency: str

    @classmethod
    def from_dict(cls, **kwargs) -> "UserSettings":
        return cls(**{k: v for k, v in kwargs.items() if k in cls.__dataclass_fields__})

    def to_dict(self) -> dict:
        return {
            "user_id": self.user_id,
            "currency": self.currency,
        }


def get_user_settings(db: Connection, user_id: int) -> UserSettings:
    """
    Retrieves user settings from the database by user ID.
    """
    assert user_id, "User ID cannot be None"

    with db.cursor() as cursor:
        cursor.execute(
            """
            SELECT id, currency
            FROM users
            WHERE id = %s
            """,
            (user_id,),
        )
        result = cursor.fetchone()
        if not result:
            raise HTTPException(status_code=404, detail=f"User settings not found for user ID {user_id}")

        return UserSettings(
            user_id=result[0],
            currency=result[1],
        )


def update_user_settings(db: Connection, user_settings: UserSettings) -> None:
    """
    Updates user settings in the database.
    """
    assert user_settings.user_id, "User ID cannot be None"
    assert user_settings.currency in ["USD", "EUR", "GBP"], "Unssuported currency"

    with db.cursor() as cursor:
        cursor.execute(
            """
            UPDATE users
            SET currency = %s
            WHERE id = %s
            """,
            (user_settings.currency, user_settings.user_id),
        )
        db.commit()
