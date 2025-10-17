from db import get_db
from fastapi import APIRouter, Body, Depends
from models._limits import LimitAction, enforce_limit
from models.symbol import Symbol
from models.watchlist import (
    create_watchlist_item,
    get_watchlist_by_user,
    remove_watchlist_item,
    update_watchlist_item,
)

from routers.auth import get_session

router = APIRouter()


@router.get("/")
async def api_get_watchlist(
    db=Depends(get_db),
    session=Depends(get_session),
):
    symbols = await get_watchlist_by_user(db, session)
    return [s.to_dict() for s in symbols]


@router.post("/")
async def api_create_watchlist_item(
    symbol_data: dict = Body(...),
    _=enforce_limit(LimitAction.ADD_SHARE),
    db=Depends(get_db),
    session=Depends(get_session),
):
    symbol = Symbol.from_dict(**symbol_data)
    watchlist = create_watchlist_item(db, session, symbol)
    return watchlist.to_dict()


@router.put("/{symbol_id}")
async def api_update_watchlist_item(
    symbol_id: str,
    symbol_data: dict = Body(...),
    db=Depends(get_db),
    session=Depends(get_session),
):
    price = symbol_data.get("price", None)
    symbol = await update_watchlist_item(db, session, symbol_id, price)
    return symbol.to_dict()


@router.delete("/{symbol_id}")
async def api_remove_watchlist_item(
    symbol_id: str,
    db=Depends(get_db),
    session=Depends(get_session),
):
    remove_watchlist_item(db, session, symbol_id)
