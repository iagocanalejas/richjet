from db import get_db
from fastapi import APIRouter, Body, Depends
from models.symbol import Symbol, create_symbol

from routers.auth import get_session

router = APIRouter()


@router.post("/")
async def api_create_symbol(
    symbol_data: dict = Body(...),
    db=Depends(get_db),
    session=Depends(get_session),
):
    symbol = Symbol.from_dict(**symbol_data, user_created=True)
    symbol = create_symbol(db, symbol)
    # TODO: create watchlist item
    return symbol.to_dict()
