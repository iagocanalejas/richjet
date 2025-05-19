import json
from dataclasses import dataclass

from fastapi import HTTPException
from psycopg2.extensions import connection as Connection

from models.user import User


@dataclass
class Session:
    session_id: str
    user: User | int
    tokens: dict
    expires: float

    def to_dict(self) -> dict:
        return {
            "user_id": self.user.id if isinstance(self.user, User) else self.user,
            "session_id": self.session_id,
            "tokens": self.tokens,
            "expires": self.expires,
        }


def get_session_by_id(db: Connection, session_id: str) -> Session:
    """
    Retrieves a session from the database by session ID.
    """
    assert session_id, "Session ID cannot be None"

    with db.cursor() as cursor:
        cursor.execute(
            """
            SELECT s.id, s.tokens, s.expires, u.id, u.email, u.given_name, u.family_name, u.picture, u.created_at
            FROM sessions s JOIN users u ON s.user_id = u.id
            WHERE s.id = %s
            """,
            (session_id,),
        )
        result = cursor.fetchone()
        if not result:
            raise HTTPException(status_code=401, detail="Not authenticated")

        return Session(
            session_id=result[0],
            tokens=json.loads(result[1]),
            expires=result[2],
            user=User(
                id=result[3],
                email=result[4],
                given_name=result[5],
                family_name=result[6],
                picture=result[7],
                created_at=result[8],
            ),
        )


def update_session(db: Connection, session: Session) -> None:
    assert session, "Session object cannot be None"
    assert session.session_id, "Session ID cannot be None"
    assert session.user, "User cannot be None"
    assert session.tokens, "Tokens cannot be None"
    assert session.expires, "Expires cannot be None"

    with db.cursor() as cursor:
        cursor.execute(
            """
            INSERT INTO sessions (id, user_id, tokens, expires)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (id) DO UPDATE
            SET user_id = EXCLUDED.user_id,
                tokens = EXCLUDED.tokens,
                expires = EXCLUDED.expires,
                updated_at = CURRENT_TIMESTAMP;
                """,
            (
                session.session_id,
                session.user.id if isinstance(session.user, User) else session.user,
                json.dumps(session.tokens),
                session.expires,
            ),
        )
        db.commit()
