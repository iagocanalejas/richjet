from dataclasses import dataclass
from datetime import datetime

from fastapi import HTTPException
from log.errors import required_msg
from psycopg2.extensions import connection as Connection
from psycopg2.extras import RealDictCursor, RealDictRow


@dataclass
class User:
    email: str
    given_name: str | None
    family_name: str | None
    picture: str | None
    id: str = ""
    created_at: str | None = None

    @classmethod
    def from_row(cls, row: RealDictRow) -> "User":
        return cls(
            id=row["user_id"] if "user_id" in row else row["id"],
            email=row["email"],
            given_name=row["given_name"],
            family_name=row["family_name"],
            picture=row["picture"],
            created_at=row["created_at"],
        )

    @classmethod
    def from_dict(cls, **kwargs) -> "User":
        return cls(**{k: v for k, v in kwargs.items() if k in cls.__dataclass_fields__})

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
    if not user.email:
        raise HTTPException(status_code=400, detail=required_msg("user.email"))

    sql = """
        INSERT INTO users (email, given_name, family_name, picture)
        VALUES (%s, %s, %s, %s)
        ON CONFLICT (email) DO NOTHING
        RETURNING id, created_at
    """

    with db.cursor(cursor_factory=RealDictCursor) as cursor:
        cursor.execute(sql, (user.email, user.given_name, user.family_name, user.picture))
        row = cursor.fetchone()

    if row:
        user.id = row["id"]
        user.created_at = row["created_at"]
        db.commit()
        return user

    return get_user_by_email(db, user.email)


def get_user_by_email(db: Connection, email: str) -> User:
    """
    Gets a user from the database by email.
    """
    if not email:
        raise HTTPException(status_code=400, detail=required_msg("email"))

    sql = """
        SELECT id, email, given_name, family_name, picture, created_at
        FROM users
        WHERE email = %s
    """

    with db.cursor(cursor_factory=RealDictCursor) as cursor:
        cursor.execute(sql, (email,))
        result = cursor.fetchone()

    if not result:
        raise HTTPException(status_code=404, detail=f"User with email {email} not found")

    return User.from_row(result)
