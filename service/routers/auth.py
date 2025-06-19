import logging
import os
import secrets
from datetime import datetime, timedelta, timezone
from urllib.parse import urljoin

import httpx
from db import get_db
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import JSONResponse, RedirectResponse
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token
from models.session import Session, get_session_by_id, update_session
from models.user import User, create_user_if_not_exists

logger = logging.getLogger("richjet")

router = APIRouter()

IS_PROD = os.getenv("DEBUG", False) != "True"
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
FRONTEND_BASE_URL = os.getenv("FRONTEND_BASE_URL", "http://localhost:5173/")
FRONTEND_AUTH_URL = urljoin(FRONTEND_BASE_URL.rstrip("/") + "/", "auth/callback")


async def get_session(request: Request, db=Depends(get_db)) -> Session:
    session_id = request.cookies.get("session_id")
    if not session_id:
        raise HTTPException(status_code=401, detail="No authentication session found")

    session = get_session_by_id(db, session_id)
    if not session or not session.user:
        raise HTTPException(status_code=401, detail="Invalid session or user not found")

    try:
        if datetime.now(timezone.utc).timestamp() > float(session.expires):
            logger.info("session expired, refreshing tokens")
            new_tokens = await _refresh_access_token(session.tokens.get("refresh_token", ""))
            if not new_tokens:
                raise HTTPException(status_code=401, detail="Token refresh failed")

            id_token_str = new_tokens.get("id_token")
            if not id_token_str:
                raise HTTPException(status_code=400, detail="No ID token returned")

            payload = _verify_id_token(id_token_str)
            session.tokens.update(new_tokens)
            session.expires = payload.get("exp", 0)
            update_session(db, session)

        assert isinstance(session.user, User), "User must be an instance of User"
        return session

    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Invalid session: {str(e)}")


@router.get("/login")
def login():
    state = secrets.token_urlsafe(16)
    url = (
        f"https://accounts.google.com/o/oauth2/v2/auth"
        f"?client_id={GOOGLE_CLIENT_ID}"
        f"&response_type=code"
        f"&redirect_uri={FRONTEND_AUTH_URL}"
        f"&scope=openid%20email%20profile"
        "&access_type=offline"
        "&prompt=consent"
        f"&state={state}"
    )
    response = JSONResponse({"auth_url": url})
    response.set_cookie(
        "oauth_state",
        state,
        httponly=True,
        secure=IS_PROD,
        samesite="none" if IS_PROD else "lax",
    )
    return response


@router.get("/logout")
def logout():
    response = RedirectResponse(url=FRONTEND_BASE_URL)
    response.delete_cookie("session_id")
    return response


@router.get("/callback")
async def auth_callback(code: str, state: str, request: Request, db=Depends(get_db)):
    # check CSRF
    state_cookie = request.cookies.get("oauth_state")
    if IS_PROD and (not state_cookie or state_cookie != state):
        raise HTTPException(status_code=400, detail="Invalid state parameter")

    async with httpx.AsyncClient() as client:
        token_res = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "code": code,
                "client_id": GOOGLE_CLIENT_ID,
                "client_secret": GOOGLE_CLIENT_SECRET,
                "redirect_uri": f"{FRONTEND_AUTH_URL}",
                "grant_type": "authorization_code",
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        token_res.raise_for_status()

        tokens = token_res.json()
        id_token_str = tokens.get("id_token")
        if not id_token_str:
            raise HTTPException(status_code=400, detail="No ID token returned")

        payload = _verify_id_token(id_token_str)
        user = create_user_if_not_exists(db, User.from_dict(**payload))
        assert user.id, "User ID cannot be None"

        session_id = secrets.token_urlsafe(32)
        update_session(
            db,
            Session(
                session_id=session_id,
                user=user.id,
                tokens=tokens,
                expires=payload.get("exp", 0),
            ),
        )

        response = JSONResponse({"redirect_url": FRONTEND_BASE_URL})
        response.delete_cookie("oauth_state", path="/")
        response.set_cookie(
            key="session_id",
            value=session_id,
            httponly=True,
            secure=IS_PROD,
            samesite="none" if IS_PROD else "lax",
            max_age=604800 if IS_PROD else 3200,
            expires=datetime.now(timezone.utc) + (timedelta(seconds=604800) if IS_PROD else timedelta(seconds=3200)),
        )
        return response


@router.get("/me")
async def me(session=Depends(get_session)):
    return session.user.to_dict()


async def _refresh_access_token(refresh_token: str) -> dict:
    async with httpx.AsyncClient() as client:
        res = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "client_id": GOOGLE_CLIENT_ID,
                "client_secret": GOOGLE_CLIENT_SECRET,
                "refresh_token": refresh_token,
                "grant_type": "refresh_token",
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )

    if res.status_code != 200:
        raise HTTPException(status_code=400, detail="Failed to refresh access token")

    return res.json()


def _verify_id_token(id_token_str: str) -> dict:
    try:
        return id_token.verify_oauth2_token(
            id_token_str,
            google_requests.Request(),
            GOOGLE_CLIENT_ID,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Token verification failed: {e}")
