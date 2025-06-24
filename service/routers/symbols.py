from db import get_db
from fastapi import APIRouter, Body, Depends
from models.symbol import Symbol, create_symbol
from models.watchlist import create_watchlist_item

from routers.auth import get_session

router = APIRouter()


@router.post("/")
async def api_create_symbol(
    symbol_data: dict = Body(...),
    db=Depends(get_db),
    session=Depends(get_session),
):
    symbol = Symbol.from_dict(**symbol_data)
    symbol = create_symbol(db, symbol, user_created=True)
    create_watchlist_item(db, session.user.id, symbol)
    return symbol.to_dict()
