import json
from dataclasses import dataclass

from fastapi import HTTPException
from log.errors import required_msg
from psycopg2.extensions import connection as Connection
from psycopg2.extras import RealDictCursor

from models.user import User


@dataclass
class Session:
    session_id: str
    user: User | str
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
    if not session_id:
        raise HTTPException(status_code=400, detail=required_msg("session_id"))

    sql = """
        SELECT s.id AS session_id, s.tokens, s.expires,
               u.id AS user_id, u.email, u.given_name, u.family_name, u.picture, u.created_at
        FROM sessions s
        JOIN users u ON s.user_id = u.id
        WHERE s.id = %s
    """

    with db.cursor(cursor_factory=RealDictCursor) as cursor:
        cursor.execute(sql, (session_id,))
        row = cursor.fetchone()

    if not row:
        raise HTTPException(status_code=401, detail="Not authenticated")

    try:
        tokens = json.loads(row["tokens"])
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Corrupted session tokens")

    return Session(
        session_id=row["session_id"],
        tokens=tokens,
        expires=row["expires"],
        user=User.from_row(row),
    )


def update_session(db: Connection, session: Session) -> None:
    if not session.session_id:
        raise HTTPException(status_code=400, detail="invalid session: 'session_id'")
    if not session.user:
        raise HTTPException(status_code=400, detail="invalid session: 'user'")
    if not session.tokens:
        raise HTTPException(status_code=400, detail="invalid session: 'tokens'")
    if not session.expires:
        raise HTTPException(status_code=400, detail="invalid session: 'expires'")

    try:
        user_id = session.user.id if isinstance(session.user, User) else session.user
        tokens_json = json.dumps(session.tokens)
    except (AttributeError, TypeError, ValueError) as e:
        raise HTTPException(status_code=400, detail=f"Invalid session data: {e}")

    sql = """
        INSERT INTO sessions (id, user_id, tokens, expires)
        VALUES (%s, %s, %s, %s)
        ON CONFLICT (id) DO UPDATE
        SET user_id = EXCLUDED.user_id,
            tokens = EXCLUDED.tokens,
            expires = EXCLUDED.expires,
            updated_at = CURRENT_TIMESTAMP;
    """

    with db.cursor() as cursor:
        cursor.execute(sql, (session.session_id, user_id, tokens_json, session.expires))
        db.commit()
