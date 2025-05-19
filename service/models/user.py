from dataclasses import dataclass
from datetime import datetime

from fastapi import HTTPException
from psycopg2.extensions import connection as Connection


@dataclass
class User:
    email: str
    given_name: str | None
    family_name: str | None
    picture: str | None
    id: int = 0
    created_at: str | None = None

    @classmethod
    def from_dict(cls, **kwargs) -> "User":
        item = cls(**{k: v for k, v in kwargs.items() if k in cls.__dataclass_fields__})
        return item

    def to_dict(self) -> dict:
        if isinstance(self.created_at, datetime):
            self.created_at = self.created_at.isoformat()
        return {
            "id": self.id,
            "email": self.email,
            "name": f"{self.given_name or ''} {self.family_name or ''}".strip(),
            "picture": self.picture,
            "created_at": self.created_at,
        }


def create_user_if_not_exists(db: Connection, user: User) -> User:
    """
    Creates a user in the database if it doesn't exist.
    """
    assert user, "User object cannot be None"
    assert user.email, "User email cannot be None"

    with db.cursor() as cursor:
        cursor.execute(
            """
            INSERT INTO users (email, given_name, family_name, picture)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (email) DO NOTHING
            RETURNING id, created_at
            """,
            (user.email, user.given_name, user.family_name, user.picture),
        )
        result = cursor.fetchone()
        if not result:
            return get_user_by_email_or_raise(db, user.email)

        user.id, user.created_at = result
        db.commit()
        return user


def get_user_by_email_or_raise(db: Connection, email: str) -> User:
    """
    Gets a user from the database by email.
    """
    assert email, "Email cannot be None"

    with db.cursor() as cursor:
        cursor.execute(
            """
            SELECT id, email, given_name, family_name, picture, created_at
            FROM users
            WHERE email = %s
            """,
            (email,),
        )
        result = cursor.fetchone()
        if not result:
            raise HTTPException(status_code=401, detail="User not found")

        return User(
            id=result[0],
            email=result[1],
            given_name=result[2],
            family_name=result[3],
            picture=result[4],
            created_at=result[5],
        )
