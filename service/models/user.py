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
    plan: str = "FREE"

    stripe_id: str | None = None
    created_at: str | None = None

    @classmethod
    def from_row(cls, row: RealDictRow) -> "User":
        return cls(
            id=row["user_id"] if "user_id" in row else row["id"],
            plan=row.get("plan_name", "FREE"),
            email=row["email"],
            given_name=row["given_name"],
            family_name=row["family_name"],
            picture=row["picture"],
            stripe_id=row.get("stripe_id", None),
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
            "plan": self.plan,
            "created_at": self.created_at,
        }


def create_user_if_not_exists(db: Connection, user: User) -> User:
    """
    Creates a user in the database if it doesn't exist.
    """
    if not user.email:
        raise HTTPException(status_code=400, detail=required_msg("user.email"))

    sql = """
        INSERT INTO users (email, given_name, family_name, picture, plan_id)
        VALUES (%s, %s, %s, %s, (SELECT id FROM plans WHERE enabled = TRUE AND name = 'FREE' LIMIT 1))
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
        SELECT u.id, email, given_name, family_name, picture, u.stripe_id, u.created_at,
            COALESCE(p.name, 'FREE') AS plan_name
        FROM users u LEFT JOIN plans p ON u.plan_id = p.id
        WHERE email = %s
    """

    with db.cursor(cursor_factory=RealDictCursor) as cursor:
        cursor.execute(sql, (email,))
        result = cursor.fetchone()

    if not result:
        raise HTTPException(status_code=404, detail=f"User with email {email} not found")

    return User.from_row(result)


def update_stripe_customer(db: Connection, user_id: str, customer_id: str):
    """
    Updates the Stripe customer ID and plan for a user.
    """
    if not user_id:
        raise HTTPException(status_code=400, detail=required_msg("user_id"))
    if not customer_id:
        raise HTTPException(status_code=400, detail=required_msg("customer_id"))

    sql = """
        UPDATE users SET stripe_id = %s WHERE id = %s
    """

    with db.cursor() as cursor:
        cursor.execute(sql, (customer_id, user_id))
        db.commit()

    if cursor.rowcount == 0:
        raise HTTPException(status_code=404, detail=f"User with ID {user_id} not found")


def update_stripe_plan(db: Connection, customer_id: str, plan_id: str):
    """
    Updates the Stripe customer ID and plan for a user.
    """
    if not customer_id:
        raise HTTPException(status_code=400, detail=required_msg("customer_id"))
    if not plan_id:
        raise HTTPException(status_code=400, detail=required_msg("plan_id"))

    sql = """
        UPDATE users SET plan_id = (SELECT id FROM plans WHERE stripe_id = %s) WHERE stripe_id = %s
    """

    with db.cursor() as cursor:
        cursor.execute(sql, (plan_id, customer_id))
        db.commit()

    if cursor.rowcount == 0:
        raise HTTPException(status_code=404, detail=f"User with customer_id {customer_id} not found")


def unsubscribe(db: Connection, customer_id: str):
    """
    Unsubscribes a user by setting their plan to 'FREE'.
    """
    if not customer_id:
        raise HTTPException(status_code=400, detail=required_msg("customer_id"))

    sql = """
        UPDATE users
        SET plan_id = (SELECT id FROM plans WHERE name = 'FREE' LIMIT 1), stripe_id = NULL
        WHERE stripe_id = %s
    """

    with db.cursor() as cursor:
        cursor.execute(sql, (customer_id,))
        db.commit()
